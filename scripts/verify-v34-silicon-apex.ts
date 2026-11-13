/**
 * @file scripts/verify-v34-silicon-apex.ts
 * @description Standalone Verification Suite for Phases 20–24 (v34.0-SILICON-SINGULARITY-APEX).
 */

import { SovereignSiliconApexV34 } from '../include/SovereignSiliconApexV34.js';

console.log('================================================================');
console.log('SOVEREIGN RUBICON-CORE v34.0 SILICON SINGULARITY APEX VERIFIER');
console.log('================================================================');

const receipt = SovereignSiliconApexV34.executeApexCycle('VERIFY-V34-SILICON-APEX');

console.log(JSON.stringify(receipt, null, 2));

if (!receipt.phase20_siliconRtl.allBitExact) {
  throw new Error('Phase 20 RTL Mersenne-31 bit-exact check failed!');
}
if (receipt.phase21_lean4Formal.totalTheoremsVerified < 5) {
  throw new Error('Phase 21 Lean 4 formal theorem count below threshold!');
}
if (!receipt.phase22_tfheParliament.homomorphismVerified) {
  throw new Error('Phase 22 TFHE homomorphic tally check failed!');
}
if (receipt.phase23_noiseNxVrf.ecdhSharedSecretsVerified !== 5 || !receipt.phase23_noiseNxVrf.vrfSignatureValid) {
  throw new Error('Phase 23 Noise_NX X25519 / VRF verification failed!');
}
if (!receipt.phase24_ipfsSpore.sporeCidV1Hex.startsWith('f01551220')) {
  throw new Error('Phase 24 IPFS CIDv1 spore format invalid!');
}

console.log('================================================================');
console.log(`VERIFICATION COMPLETE: ALL PHASES 20-24 VERIFIED (${receipt.totalExecutionLatencyUs} us)`);
console.log('================================================================');
