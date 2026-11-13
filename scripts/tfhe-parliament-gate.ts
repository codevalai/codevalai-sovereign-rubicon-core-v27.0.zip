/**
 * @file scripts/tfhe-parliament-gate.ts
 * @version 34.0.0 (Phase 22: Real Integer-Lattice LWE/TFHE 5-Node Agent Parliament Gate)
 */

import { SovereignSiliconApexV34 } from '../include/SovereignSiliconApexV34.js';

const receipt = SovereignSiliconApexV34.executeApexCycle('TFHE-PARLIAMENT-GATE-CLI');
const tfhe = receipt.phase22_tfheParliament;

console.log(`[TFHE-PARLIAMENT] Scheme: ${tfhe.scheme} (n=${tfhe.latticeDimensionN}, q=${tfhe.modulusQ}, Δ=${tfhe.scalingDelta})`);
console.log(`[TFHE-PARLIAMENT] Encrypted Ballots Evaluated: ${tfhe.encryptedBallots.length}/5`);
console.log(`[TFHE-PARLIAMENT] Homomorphic Aggregate Tally: ${tfhe.homomorphicAggregateTally} (Expected: ${tfhe.expectedPlaintextSum})`);
console.log(`[TFHE-PARLIAMENT] Noise Margin Remaining: ${tfhe.aggregateNoiseMargin} | Homomorphism Verified: ${tfhe.homomorphismVerified}`);
console.log(`[TFHE-PARLIAMENT] Encrypted State Transition Proof: ${receipt.apexCompositeMerkleRootHex.slice(0, 48)}`);

if (!tfhe.homomorphismVerified) {
  console.error('[TFHE-PARLIAMENT] FATAL: LWE homomorphic decryption mismatch!');
  process.exit(1);
}
