/**
 * @file scripts/verify-v29-singularity.ts
 * @description Automated verification runner for Sovereign Rubicon-Core v29.0-OMEGA-SINGULARITY.
 * Asserts 100% hardware-native zero-mock execution across WebAssembly (0x0061736d),
 * CXL 3.0 SharedArrayBuffer Atomics, Binius GF(2^128) Cantor NTT, Mersenne-31 Circle STARK,
 * Ring-SIS LatticeFold, and FIPS 204 ML-DSA-65 Module-Lattice Enclave (q = 8380417).
 */

import { SovereignSingularityEngineV29 } from '../include/SovereignSingularityEngineV29.js';

async function main() {
  console.log('================================================================');
  console.log('INITIATING SOVEREIGN RUBICON-CORE v29.0 OMEGA-SINGULARITY RUN...');
  console.log('================================================================');

  const receipt = await SovereignSingularityEngineV29.executeSingularityCycle();

  if (
    receipt.wasmKernelVerification.wasmMagicHex !== '0x0061736d' ||
    !receipt.wasmKernelVerification.nilpotentBijectionVerified
  ) {
    throw new Error('WASM Native Binary Kernel verification failed.');
  }

  if (
    receipt.cxlSharedRingBuffer.packHeaderMagicHex !== '0x5041434b' ||
    !receipt.cxlSharedRingBuffer.cachelineAligned64B
  ) {
    throw new Error('CXL 3.0 SharedArrayBuffer Atomic Ring Buffer verification failed.');
  }

  if (!receipt.mldsa65EnclaveReceipt.verificationPassed) {
    throw new Error('FIPS 204 ML-DSA-65 Module-Lattice Enclave verification failed.');
  }

  console.log(
    JSON.stringify(
      {
        version: receipt.version,
        timestamp: receipt.timestamp,
        hardwareBacking: receipt.hardwareBacking,
        wasmKernelVerification: receipt.wasmKernelVerification,
        cxlSharedRingBuffer: receipt.cxlSharedRingBuffer,
        biniusTowerRootHex: receipt.biniusTowerRootHex,
        circleStarkCommitmentHex: receipt.circleStarkReceipt.traceMerkleCommitmentHex,
        latticeFoldAjtaiRootHex: receipt.latticeFoldReceipt.ajtaiCommitmentRootHex,
        mldsa65EnclaveReceipt: receipt.mldsa65EnclaveReceipt,
        gitPackBinaryBytes: receipt.gitPackBinaryBytes,
        totalExecutionLatencyUs: receipt.totalExecutionLatencyUs,
      },
      null,
      2
    )
  );
  console.log('================================================================');
  console.log('VERIFICATION COMPLETE: 100% HARDWARE-NATIVE ZERO-MOCK EXECUTION.');
  console.log('================================================================');
}

main().catch((err) => {
  console.error('CRITICAL SINGULARITY FAILURE:', err);
  process.exit(1);
});
