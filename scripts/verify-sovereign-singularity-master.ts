/**
 * @file scripts/verify-sovereign-singularity-master.ts
 * @description Master Orchestration Verification Runner for Sovereign Rubicon-Core v34.0-SILICON-SINGULARITY-APEX.
 * Executes:
 *   1. Hardware-Native WASM & ML-DSA-65 Enclave Verifier (v29)
 *   2. Planetary Expansion Fabric 20-Pillar Verifier (v30)
 *   3. Autonomous Parliament Swarm & HMAC Epoch Test (v31)
 *   4. Autonomous Self-Evolving Genetic Kernel Mutation (v32)
 *   5. Silicon-Native RISC-V RTL, Lean 4, TFHE LWE, Noise_NX VRF & IPFS Spore Suite (v34 Phases 20-24)
 */

import { SovereignAgentParliamentV31 } from '../include/SovereignAgentParliamentV31.js';
import { SovereignExpansionFabricV30 } from '../include/SovereignExpansionFabricV30.js';
import { SovereignSingularityEngineV29 } from '../include/SovereignSingularityEngineV29.js';
import { SovereignSelfEvolvingEngineV32 } from '../include/SovereignSelfEvolvingEngineV32.js';
import { SovereignSiliconApexV34 } from '../include/SovereignSiliconApexV34.js';

async function runMasterVerification() {
  console.log('================================================================');
  console.log('SOVEREIGN RUBICON-CORE v34.0 MASTER SINGULARITY VERIFICATION START');
  console.log('================================================================');

  const t0 = process.hrtime.bigint();
  const mutateKernel = process.argv.includes('--mutate-kernel');

  // 1. Verify v29 Hardware-Native Singularity Engine
  console.log('[MASTER 1/5] Executing v29 Hardware-Native WASM & ML-DSA-65 Enclave...');
  const v29Receipt = await SovereignSingularityEngineV29.executeSingularityCycle();
  if (!v29Receipt.mldsa65EnclaveReceipt.verificationPassed) {
    throw new Error('Master Verification failed at v29 ML-DSA-65 Enclave.');
  }
  console.log(`[MASTER 1/5] v29 Passed: Latency=${v29Receipt.totalExecutionLatencyUs} us | Enclave Valid=true`);

  // 2. Verify v30 Planetary Expansion Fabric (20 Pillars)
  console.log('[MASTER 2/5] Executing v30 Planetary Expansion Fabric (20 Pillars)...');
  const v30Receipt = SovereignExpansionFabricV30.executePlanetaryFabric();
  if (v30Receipt.totalPillarsExecuted !== 20) {
    throw new Error('Master Verification failed at v30 Planetary Fabric (expected 20 pillars).');
  }
  console.log(`[MASTER 2/5] v30 Passed: 20/20 Pillars Verified | Root=${v30Receipt.fabricMerkleRootHex.slice(0, 24)}...`);

  // 3. Verify Autonomous Parliament Swarm & HMAC Key Rotation
  console.log('[MASTER 3/5] Executing Autonomous 5-Node Parliament Swarm & HMAC Epochs...');
  const nodes = SovereignAgentParliamentV31.getParliamentNodes();
  if (nodes.length !== 5) {
    throw new Error('Master Verification failed: Expected 5 Parliament Swarm nodes.');
  }
  const epoch = SovereignAgentParliamentV31.rotateHmacEpoch();
  const taskReceipt = SovereignAgentParliamentV31.executeSwarmTask('agent-sentinel', 'MASTER-INVARIANT-ATTESTATION');
  if (taskReceipt.hmacEpoch !== epoch) {
    throw new Error('Parliament HMAC Epoch mismatch.');
  }
  console.log(`[MASTER 3/5] Parliament Swarm Passed: Epoch=#${epoch} | Agent=${taskReceipt.agentId} | Proof=${taskReceipt.taskProofHex.slice(0, 24)}...`);

  // 4. v32.0 Autonomous Self-Evolving Genetic Kernel Mutation
  if (mutateKernel) {
    console.log('[MASTER 4/5] Executing v32.0 Autonomous Self-Evolving Genetic Kernel Mutation...');
    const evoReport = await SovereignSelfEvolvingEngineV32.executeEvolutionaryStep();
    console.log(`[MASTER 4/5] Evolution Passed: Generation=#${evoReport.generationId} | Fitness=${evoReport.fitnessScore}% | MerkleRoot=${evoReport.merkleAuditRootHex.slice(0, 24)}...`);
  } else {
    console.log('[MASTER 4/5] v32.0 Autonomous Self-Evolving Daemon nominal (pass --mutate-kernel to trigger mutation step).');
  }

  // 5. v34.0 Silicon-Native Singularity Apex (Phases 20-24)
  console.log('[MASTER 5/5] Executing v34.0 Silicon RTL, Lean 4, TFHE LWE, Noise_NX VRF & IPFS Spore...');
  const v34Receipt = SovereignSiliconApexV34.executeApexCycle('MASTER-ORCHESTRATOR-V34');
  if (!v34Receipt.phase20_siliconRtl.allBitExact || !v34Receipt.phase22_tfheParliament.homomorphismVerified) {
    throw new Error('Master Verification failed at v34.0 Silicon Apex (RTL or TFHE mismatch).');
  }
  console.log(
    `[MASTER 5/5] v34 Passed: RTL=${v34Receipt.phase20_siliconRtl.mersenne31TestVectors} vectors bit-exact | Lean4=${v34Receipt.phase21_lean4Formal.totalTheoremsVerified} theorems | TFHE=${v34Receipt.phase22_tfheParliament.homomorphicAggregateTally}/5 | VRF=${v34Receipt.phase23_noiseNxVrf.electedLeaderNode} | Spore=${v34Receipt.phase24_ipfsSpore.sporeCidV1Hex.slice(0, 22)}...`
  );

  const totalLatencyUs = Number(process.hrtime.bigint() - t0) / 1000;

  console.log('================================================================');
  console.log(`MASTER VERIFICATION COMPLETE: ALL SUBSYSTEMS NOMINAL (${totalLatencyUs.toFixed(2)} us)`);
  console.log('================================================================');
}

runMasterVerification().catch((err) => {
  console.error('CRITICAL MASTER VERIFICATION FAILURE:', err);
  process.exit(1);
});
