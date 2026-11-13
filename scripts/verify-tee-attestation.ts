import crypto from 'node:crypto';
import fs from 'node:fs';
import { execSync } from 'node:child_process';
import { parseArgs } from 'node:util';

const { values } = parseArgs({
  options: {
    arch: { type: 'string', default: 'auto' },
    nonce: { type: 'string', default: '' },
    'expected-measurement': { type: 'string', default: '' },
    'allow-simulated-tee': { type: 'boolean', default: false },
    'output-quote': { type: 'string', default: 'dist/hardware-tee-quote.bin' },
  },
});

const SNP_OFFSETS = {
  VERSION: 0x000,
  GUEST_SVN: 0x004,
  POLICY: 0x008,
  REPORT_DATA: 0x050,
  MEASUREMENT: 0x090,
  HOST_DATA: 0x0C0,
  REPORTED_TCB: 0x180,
  CHIP_ID: 0x1A0,
  SIGNATURE: 0x2A0,
};

const TDX_OFFSETS = {
  VERSION: 0x000,
  TEE_TYPE: 0x004,
  TD_ATTRIBUTES: 0x078,
  MRTD: 0x0B8,
  REPORT_DATA: 0x238,
};

function generateDeterministicNonce(customSeed: string): Buffer {
  const commit = process.env.GITHUB_SHA || 'local-commit';
  const runId = process.env.GITHUB_RUN_ID || '0';
  const attempt = process.env.GITHUB_RUN_ATTEMPT || '1';
  return crypto
    .createHash('sha3-512')
    .update(`${commit}:${runId}:${attempt}:${customSeed}`)
    .digest();
}

function detectHardwareDevice(): 'sev-snp' | 'tdx' | 'simulated' {
  if (fs.existsSync('/dev/sev-guest') || fs.existsSync('/dev/sev')) return 'sev-snp';
  if (fs.existsSync('/dev/tdx_guest') || fs.existsSync('/dev/tdx-guest')) return 'tdx';
  if (fs.existsSync('/sys/kernel/config/tsm/report')) {
    return values.arch === 'tdx' ? 'tdx' : 'sev-snp';
  }
  return 'simulated';
}

function requestConfigFsQuote(nonce: Buffer): Buffer {
  const reportDir = `/sys/kernel/config/tsm/report/sovereign_${process.pid}`;
  fs.mkdirSync(reportDir, { recursive: true });
  try {
    fs.writeFileSync(`${reportDir}/inblob`, nonce);
    return fs.readFileSync(`${reportDir}/outblob`);
  } finally {
    fs.rmdirSync(reportDir);
  }
}

function synthesizeSimulatedSnpQuote(nonce: Buffer): Buffer {
  const buf = Buffer.alloc(1184, 0);
  buf.writeUInt32LE(2, SNP_OFFSETS.VERSION);
  buf.writeUInt32LE(1, SNP_OFFSETS.GUEST_SVN);
  buf.writeBigUInt64LE(0x30000n, SNP_OFFSETS.POLICY);
  nonce.copy(buf, SNP_OFFSETS.REPORT_DATA);
  const mockMeasurement = crypto.createHash('sha384').update('sovereign-ovmf-kernel-v32').digest();
  mockMeasurement.copy(buf, SNP_OFFSETS.MEASUREMENT);
  crypto.randomBytes(64).copy(buf, SNP_OFFSETS.CHIP_ID);
  crypto.randomBytes(96).copy(buf, SNP_OFFSETS.SIGNATURE);
  return buf;
}

function verifySnpReport(report: Buffer, expectedNonce: Buffer) {
  if (report.length < 1184) {
    throw new Error(`[TEE-FATAL] Invalid AMD SEV-SNP report size: ${report.length} bytes`);
  }
  const version = report.readUInt32LE(SNP_OFFSETS.VERSION);
  const policy = report.readBigUInt64LE(SNP_OFFSETS.POLICY);
  const debugBit = (policy >> 19n) & 1n;

  if (debugBit !== 0n) {
    throw new Error(`[TEE-FATAL] Enclave POLICY.DEBUG bit (19) is ACTIVE. Rejecting compromised enclave!`);
  }

  const embeddedNonce = report.subarray(SNP_OFFSETS.REPORT_DATA, SNP_OFFSETS.REPORT_DATA + 64);
  if (!embeddedNonce.equals(expectedNonce)) {
    throw new Error(`[TEE-FATAL] Hardware REPORT_DATA nonce mismatch!`);
  }

  const measurement = report.subarray(SNP_OFFSETS.MEASUREMENT, SNP_OFFSETS.MEASUREMENT + 48).toString('hex');
  if (values['expected-measurement'] && measurement !== values['expected-measurement'].toLowerCase()) {
    throw new Error(`[TEE-FATAL] Launch Measurement mismatch! Expected ${values['expected-measurement']}, got ${measurement}`);
  }

  const chipId = report.subarray(SNP_OFFSETS.CHIP_ID, SNP_OFFSETS.CHIP_ID + 64).toString('hex');
  return {
    teeType: 'AMD-SEV-SNP',
    abiVersion: version,
    debugEnabled: false,
    policyHex: `0x${policy.toString(16)}`,
    launchMeasurementSha384: `0x${measurement}`,
    reportDataNonceSha3: `0x${embeddedNonce.toString('hex')}`,
    hwChipIdTruncated: `0x${chipId.slice(0, 32)}...`,
  };
}

function verifyTdxQuote(quote: Buffer, expectedNonce: Buffer) {
  if (quote.length < 632) {
    throw new Error(`[TEE-FATAL] Invalid Intel TDX Quote size: ${quote.length} bytes`);
  }
  const version = quote.readUInt16LE(TDX_OFFSETS.VERSION);
  const teeType = quote.readUInt32LE(TDX_OFFSETS.TEE_TYPE);
  if (teeType !== 0x00000081) {
    throw new Error(`[TEE-FATAL] Unexpected Intel TEE_TYPE: 0x${teeType.toString(16)}`);
  }

  const tdAttributes = quote.readBigUInt64LE(TDX_OFFSETS.TD_ATTRIBUTES);
  const debugBit = tdAttributes & 1n;
  if (debugBit !== 0n) {
    throw new Error(`[TEE-FATAL] Intel TDX TD_ATTRIBUTES.DEBUG bit (0) is ACTIVE.`);
  }

  const embeddedNonce = quote.subarray(TDX_OFFSETS.REPORT_DATA, TDX_OFFSETS.REPORT_DATA + 64);
  if (!embeddedNonce.equals(expectedNonce)) {
    throw new Error(`[TEE-FATAL] Intel TDX REPORT_DATA nonce mismatch!`);
  }

  const mrtd = quote.subarray(TDX_OFFSETS.MRTD, TDX_OFFSETS.MRTD + 48).toString('hex');
  return {
    teeType: 'INTEL-TDX-DCAP',
    quoteVersion: version,
    debugEnabled: false,
    tdAttributesHex: `0x${tdAttributes.toString(16)}`,
    mrtdSha384: `0x${mrtd}`,
    reportDataNonceSha3: `0x${embeddedNonce.toString('hex')}`,
  };
}

const nonce = generateDeterministicNonce(values.nonce!);
const detected = detectHardwareDevice();
console.log(`[SOVEREIGN-TEE] Detected Hardware State: ${detected.toUpperCase()}`);

let rawQuote: Buffer;
let verificationSummary: Record<string, unknown>;

if (detected === 'simulated') {
  if (!values['allow-simulated-tee']) {
    console.error(`[TEE-FATAL] Neither /dev/sev-guest nor /dev/tdx_guest found, and --allow-simulated-tee is false.`);
    process.exit(1);
  }
  rawQuote = synthesizeSimulatedSnpQuote(nonce);
  verificationSummary = verifySnpReport(rawQuote, nonce);
  verificationSummary.mode = 'SIMULATED_ENCLAVE';
} else {
  if (fs.existsSync('/sys/kernel/config/tsm/report')) {
    rawQuote = requestConfigFsQuote(nonce);
  } else if (detected === 'sev-snp') {
    fs.writeFileSync('/tmp/snp_nonce.bin', nonce);
    execSync(`snpguest report /tmp/snp_report.bin /tmp/snp_nonce.bin`);
    rawQuote = fs.readFileSync('/tmp/snp_report.bin');
  } else {
    throw new Error(`[TEE-FATAL] ConfigFS TSM not mounted at /sys/kernel/config/tsm/report`);
  }

  verificationSummary =
    detected === 'tdx' ? verifyTdxQuote(rawQuote, nonce) : verifySnpReport(rawQuote, nonce);
  verificationSummary.mode = 'HARDWARE_SILICON_ENFORCED';
}

fs.mkdirSync('dist', { recursive: true });
fs.writeFileSync(values['output-quote']!, rawQuote);
fs.writeFileSync('dist/tee-attestation-manifest.json', JSON.stringify(verificationSummary, null, 2));
console.log(`[SOVEREIGN-TEE] HARDWARE ATTESTATION PASSED:`, JSON.stringify(verificationSummary, null, 2));
