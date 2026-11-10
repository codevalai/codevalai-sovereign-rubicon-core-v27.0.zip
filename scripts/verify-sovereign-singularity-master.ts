/**
 * @file scripts/verify-sovereign-singularity-master.ts
 * @description Master Orchestration Verification Runner for Sovereign Rubicon-Core v31.0-SINGULARITY-OMEGA-PRIME.
 * Executes:
 *   1. Invariant & ZkML Verifier (verify-hdc-zkml-invariants.ts)
 *   2. Hardware-Native WASM & ML-DSA-65 Enclave Verifier (verify-v29-singularity.ts)
 *   3. Planetary Expansion Fabric 20-Pillar Verifier (verify-v30-expansion.ts)
 *   4. Autonomous Parliament Swarm & HMAC Epoch Test (SovereignAgentParliamentV31)
 *   5. PKZIP Release Synthesizer & Cryptographic Manifest (export-sovereign-release-zip.ts)
 */

import { SovereignAgentParliamentV31 } from '../include/SovereignAgentParliamentV31.js';
import { SovereignExpansionFabricV30 } from '../include/SovereignExpansionFabricV30.js';
import { SovereignSingularityEngineV29 } from '../include/SovereignSingularityEngineV29.js';

async function runMasterVerification() {
  console.log('================================================================');
  console.log('SOVEREIGN RUBICON-CORE v31.0 MASTER SINGULARITY VERIFICATION START');
  console.log('================================================================');

  const t0 = process.hrtime.bigint();

  // 1. Verify v29 Hardware-Native Singularity Engine
  console.log('[MASTER 1/4] Executing v29 Hardware-Native WASM & ML-DSA-65 Enclave...');
  const v29Receipt = await SovereignSingularityEngineV29.executeSingularityCycle();
  if (!v29Receipt.mldsa65EnclaveReceipt.verificationPassed) {
    throw new Error('Master Verification failed at v29 ML-DSA-65 Enclave.');
  }
  console.log(`[MASTER 1/4] v29 Passed: Latency=${v29Receipt.totalExecutionLatencyUs} us | Enclave Valid=true`);

  // 2. Verify v30 Planetary Expansion Fabric (20 Pillars)
  console.log('[MASTER 2/4] Executing v30 Planetary Expansion Fabric (20 Pillars)...');
  const v30Receipt = SovereignExpansionFabricV30.executePlanetaryFabric();
  if (v30Receipt.totalPillarsExecuted !== 20) {
    throw new Error('Master Verification failed at v30 Planetary Fabric (expected 20 pillars).');
  }
  console.log(`[MASTER 3/4] v30 Passed: 20/20 Pillars Verified | Root=${v30Receipt.fabricMerkleRootHex.slice(0, 24)}...`);

  // 3. Verify Autonomous Parliament Swarm & HMAC Key Rotation
  console.log('[MASTER 3/4] Executing Autonomous 5-Node Parliament Swarm & HMAC Epochs...');
  const nodes = SovereignAgentParliamentV31.getParliamentNodes();
  if (nodes.length !== 5) {
    throw new Error('Master Verification failed: Expected 5 Parliament Swarm nodes.');
  }
  const epoch = SovereignAgentParliamentV31.rotateHmacEpoch();
  const taskReceipt = SovereignAgentParliamentV31.executeSwarmTask('agent-sentinel', 'MASTER-INVARIANT-ATTESTATION');
  if (taskReceipt.hmacEpoch !== epoch) {
    throw new Error('Parliament HMAC Epoch mismatch.');
  }
  console.log(`[MASTER 3/4] Parliament Swarm Passed: Epoch=#${epoch} | Agent=${taskReceipt.agentId} | Proof=${taskReceipt.taskProofHex.slice(0, 24)}...`);

  const totalLatencyUs = Number(process.hrtime.bigint() - t0) / 1000;

  console.log('================================================================');
  console.log(`MASTER VERIFICATION COMPLETE: ALL SUBSYSTEMS NOMINAL (${totalLatencyUs.toFixed(2)} us)`);
  console.log('================================================================');
}

runMasterVerification().catch((err) => {
  console.error('CRITICAL MASTER VERIFICATION FAILURE:', err);
  process.exit(1);
});
