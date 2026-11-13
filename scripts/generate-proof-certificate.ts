import crypto from 'node:crypto';
import fs from 'node:fs';
import { execSync } from 'node:child_process';

interface InvariantGate {
  suite: string;
  command: string;
  durationMs: number;
  stdoutDigest: string;
  status: 'VERIFIED' | 'FAILED';
}

const SUITES = [
  { suite: 'ML-DSA-65-PostQuantum', command: 'npm run verify:mldsa' },
  { suite: 'HDC-10240-zkML-TernaryALU', command: 'npm run test:crypto:hybrid' },
  { suite: 'HotStuff-3Phase-BFT-Swarm', command: 'npm run test:swarm:pbft' },
  { suite: 'Byzantine-Chaos-Fuzzer', command: 'npm run fuzz:consensus' },
];

const results: InvariantGate[] = [];
let merkleAccumulator = Buffer.alloc(64, 0);

console.log(`[SOVEREIGN-LEDGER] Synthesizing Deterministic Verification Certificate...`);

for (const item of SUITES) {
  const start = performance.now();
  const output = execSync(item.command, { encoding: 'utf8' });
  const durationMs = Math.round(performance.now() - start);

  const digest = crypto.createHash('sha3-512').update(output).digest();
  merkleAccumulator = crypto
    .createHash('sha3-512')
    .update(Buffer.concat([merkleAccumulator, digest]))
    .digest();

  results.push({
    suite: item.suite,
    command: item.command,
    durationMs,
    stdoutDigest: `0x${digest.toString('hex')}`,
    status: 'VERIFIED',
  });
}

const certificate = {
  schema: 'sovereign-rubicon-core/v32.0-PROOF-CERTIFICATE',
  timestamp: new Date().toISOString(),
  gitCommit: process.env.GITHUB_SHA || 'local-dev',
  gitRef: process.env.GITHUB_REF || 'local-ref',
  architecture: `${process.platform}-${process.arch}`,
  nodeVersion: process.version,
  gates: results,
  stateMerkleRoot: `0x${merkleAccumulator.toString('hex')}`,
};

fs.mkdirSync('dist', { recursive: true });
fs.writeFileSync('dist/sovereign-proof-certificate.json', JSON.stringify(certificate, null, 2));
console.log(`[SOVEREIGN-LEDGER] Proof Certificate sealed: dist/sovereign-proof-certificate.json`);
console.log(`[SOVEREIGN-LEDGER] Composite State Root: ${certificate.stateMerkleRoot}`);
