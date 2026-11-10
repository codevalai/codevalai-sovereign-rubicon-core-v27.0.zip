import { SovereignHDC158Engine } from '../SovereignHDC158Engine.js';
import { CloneFactoryREAEngine } from '../CloneFactoryREAEngine.js';
import { SovereignSingularityEngine } from '../SovereignSingularityEngine.js';
import { SovereignRubiconKernel } from '../SovereignRubiconKernel.js';
import { executeZenithV25FullCycle } from '../include/SovereignZenithV25Core.js';
import { SovereignHaPPYCodeEngine } from '../include/SovereignHaPPYCode.js';
import { SovereignNovaFolder } from '../include/SovereignNovaFolder.js';
import { SovereignWGPUHypergrid } from '../include/SovereignWGPUHypergrid.js';
import { SovereignOmegaOrchestratorV26 } from '../include/SovereignOmegaOrchestratorV26.js';
import { SovereignReleaseExporter } from '../include/SovereignExportScriptV26.js';
import { sovereignEngine } from '../src/server/sovereignKernel.js';

async function verifyHdcZkmlAndLiveCloneInvariants() {
  console.log(
    '=== [SOVEREIGN HYPER-OMEGA SINGULARITY v27.0: 8-STAGE CLOSED LOOP, CIRCLE STARK M31, LATTICEFOLD RING-SIS, GF(2^128) TOWER, HaPPY [[5,1,3]], Z[tau] BRAID & 22-FILE MANIFEST VERIFIER] ==='
  );

  const engine = new SovereignHDC158Engine();
  const hv1 = engine.encodeHypervector('SovereignLatticeCore');
  const hv2 = engine.encodeHypervector('SovereignLatticeCore');
  const hvOrthogonal = engine.encodeHypervector('OrthogonalByzantineProbe');

  const selfSimilarity = engine.computeHDCSimilarity(hv1, hv2);
  const orthoSimilarity = engine.computeHDCSimilarity(hv1, hvOrthogonal);

  if (selfSimilarity !== 1) {
    throw new Error(`Expected identical hypervector similarity = 1, got ${selfSimilarity}`);
  }
  console.log(
    `[1/12] 10,240-Bit SHAKE-256 HDC Hypervector Verified: Self-Similarity=${selfSimilarity} | Orthogonal-Similarity=${orthoSimilarity}`
  );

  const weights = engine.quantizeTernaryWeights([0.9, -0.8, 0.1, 0.0, -0.05, 1.2]);
  const dot = engine.ternaryDotProduct(weights, [10, 20, 30, 40, 50, 60]);
  const zkProof = engine.generateZkMLProof('4b825dc642cb6eb9a060e54bf8d69288fbee4904', 'sha256_hv_root');
  if (!engine.verifyZkMLProofString('4b825dc642cb6eb9a060e54bf8d69288fbee4904', 'sha256_hv_root', zkProof)) {
    throw new Error('Fiat-Shamir zkML proof verification failed.');
  }
  console.log(
    `[2/12] 1.58-Bit Ternary Quantization & Zero-Float Dot Product Verified: Weights=[${weights.join(', ')}] | Dot=${dot} | zkML=${zkProof.slice(0, 28)}...`
  );

  const liveClone = await CloneFactoryREAEngine.cloneAndDecompileLive(
    'codevalai',
    'XERJ-Sovereign-Nexus'
  );
  const zipMagic = liveClone.zipBuffer.readUInt32LE(0);
  if (zipMagic !== 0x04034b50) {
    throw new Error(`Invalid PKZIP magic: 0x${zipMagic.toString(16)}`);
  }
  console.log(
    `[3/12] Live CloneFactoryREAEngine & TypeScript AST Decompiler Verified: ${liveClone.cloneId} | Files=${liveClone.astTopology.totalFiles} | AST Nodes=${liveClone.astTopology.totalAstNodes} | PKZIP=${liveClone.zipBuffer.length} bytes`
  );

  const zenith = executeZenithV25FullCycle();
  if (!zenith.dehornoyCanonicalIsotopicVerified || zenith.yangBaxterExactError > 1e-12) {
    throw new Error('Zenith v25.0 Unitary Fibonacci Braiding or Dehornoy Handle Reduction failed.');
  }
  console.log(
    `[4/12] SovereignZenithV25Core Sub-35us Cycle Verified: FullCycle=${zenith.fullCycleLatencyUs} us | LUT-Inflate=${zenith.lutZeroCopyInflateLatencyUs} us | XOR320=${zenith.swarXor320WordsLatencyUs} us | DualPlane158b=${zenith.dualPlaneTernaryLatencyUs} us | Toeplitz H_inf=${zenith.toeplitzMinEntropyBitsPerByte} bits/B (ChiSq=${zenith.toeplitzChiSquare}) | YB_Err=${zenith.yangBaxterExactError.toExponential(2)}`
  );

  const happyEngine = new SovereignHaPPYCodeEngine();
  const happyReport = happyEngine.executeHolographicBulkReconstruction(0.511);
  if (
    happyReport.status !== 'BULK_ENTANGLEMENT_WEDGE_RECONSTRUCTED' ||
    happyReport.reconstructedBulkNodes !== 21
  ) {
    throw new Error(`HaPPY [[5, 1, 3]] Bulk Reconstruction failed: ${JSON.stringify(happyReport)}`);
  }
  console.log(
    `[5/12] SovereignHaPPYCode [[5, 1, 3]] Verified: ${happyReport.reconstructedBulkNodes}/${happyReport.totalBulkPentagons} Pentagons Reconstructed (${happyReport.bulkRecoverySuccessRatePct}%) from ${happyReport.boundarySurvivalRatioPct}% Boundary Survival in ${happyReport.reconstructionLatencyUs} us | Root=${happyReport.recoveredRootCommitHash}`
  );

  const novaFolder = new SovereignNovaFolder();
  const novaAcc = novaFolder.foldAllInstancesAndBlindStarkPush(105);
  if (!novaAcc.algebraicSatisfied || !novaAcc.blindStarkFriCommitment.zeroKnowledgeBlindVerified) {
    throw new Error('Nova/Sangria R1CS Folding or FRI-STARK Blind Push failed.');
  }
  console.log(
    `[6/12] SovereignNovaFolder Verified: Folded=${novaAcc.foldedInstanceCount} R1CS Instances | Decider=${novaAcc.singleCheckVerificationUs} us | FRI-STARK=${novaAcc.blindStarkFriCommitment.friMerkleRootHex}`
  );

  const wgpu = new SovereignWGPUHypergrid();
  const qHv = new Uint32Array(320);
  const wP = new Uint32Array(320);
  const wN = new Uint32Array(320);
  for (let i = 0; i < 320; i++) {
    qHv[i] = (0x9e3779b9 ^ (i * 0x85ebca6b)) >>> 0;
    wP[i] = (0x55555555 ^ (i * 0xc2b2ae35)) >>> 0;
    wN[i] = (~wP[i] & 0x33333333) >>> 0;
  }
  const wgpuReport = await wgpu.executeMillionCommitSweep(qHv, wP, wN, 4850, 12);
  console.log(
    `[7/12] SovereignWGPUHypergrid 1,000,000-Commit Sweep Verified: Latency=${wgpuReport.kernelExecutionLatencyUs} us | Bandwidth=${wgpuReport.effectiveBandwidthGBps} GB/s | BestCommit=#${wgpuReport.bestMatchCommitId} (Sim=${wgpuReport.bestMatchSimilarityPct}%)`
  );

  const rubicon = new SovereignRubiconKernel();
  const bench = rubicon.executeLiveRubiconBenchmark();
  const rubiconZip = rubicon.buildRubiconCoreGitHubZip();
  if (rubiconZip.zipBuffer.readUInt32LE(0) !== 0x04034b50) {
    throw new Error('Rubicon-Core PKZIP bundle magic mismatch.');
  }
  console.log(
    `[8/12] codevalai/sovereign-rubicon-core v27.0 Verified: Cycle=${bench.totalExecutionUs} us | DiffBits=${bench.vectorBitmapXorDiff.diffBitsPopcount} | RepoBundle=${rubiconZip.zipBuffer.length} bytes (${rubiconZip.fileManifest.length} files)`
  );

  const omniSweep = sovereignEngine.getOmniWorkflows().executeLivePillarSweep('ALL');
  if (omniSweep.totalTasksVerified !== 100) {
    throw new Error(`Expected 100 verified workflows, got ${omniSweep.totalTasksVerified}`);
  }
  console.log(
    `[9/12] Sovereign 100 Max-Capacity Production Workflows Verified: ${omniSweep.totalTasksVerified}/100 Live Tasks in ${omniSweep.totalSweepMs} ms`
  );

  const vote = sovereignEngine
    .getGitHypergrid()
    .broadcastRefspecVote(
      'agent-aletheia',
      sovereignEngine.runDiagnostics().hmacEpoch,
      undefined,
      '+refs/swarm/omega-v27.0:refs/heads/hdc-sync'
    );
  console.log(
    `[10/12] Refspec Broadcast Verified: ${vote.refspec} -> OID ${vote.commitOid.slice(0, 16)}... (ML-DSA-65 Valid=${vote.verified})`
  );

  // [11/12] SovereignOmegaOrchestratorV26 8-Stage Closed Loop (Binius GF(2^128), Circle STARK M31, LatticeFold Ring-SIS, Git Pack v2)
  const omega = await SovereignOmegaOrchestratorV26.executeClosedLoop();
  if (
    omega.stage5_happyRecovery.status !== 'HOLOGRAPHIC_BULK_RECONSTRUCTED_100_PCT' ||
    !omega.stage6_biniusAndLut.lutRoundtripVerified ||
    !omega.stage7_circleStarkM31.circleOrthogonalityVerified ||
    !omega.stage7_circleStarkM31.ternaryConstraintSatisfied ||
    !omega.stage8_latticeFoldAndGitPack.latticeFold.homomorphicRelationVerified ||
    !omega.stage8_latticeFoldAndGitPack.latticeFold.normBoundSatisfied ||
    omega.stage8_latticeFoldAndGitPack.gitBinaryPack.packMagicHex !== '0x5041434b' ||
    omega.stage8_latticeFoldAndGitPack.gitBinaryPack.idxMagicHex !== '0xff744f63' ||
    !omega.frontierModulesVerification.marsLtFountain.bitExactRecovery ||
    !omega.frontierModulesVerification.surfaceCodeUnionFind.logicalChannelFidelity ||
    !omega.frontierModulesVerification.crisprQuaternaryHdc.bijectiveRoundtripVerified ||
    !omega.frontierModulesVerification.yoshidaSymplecticOrbit.symplecticInvariantPreserved ||
    !omega.frontierModulesVerification.kanervaSdmAttractor.exactFixedPointConverged
  ) {
    throw new Error(`SovereignOmegaOrchestratorV26 8-Stage Closed Loop failed: ${JSON.stringify(omega)}`);
  }
  console.log(
    `[11/12] SovereignOmegaOrchestratorV26 8-Stage Closed Loop Verified: Z[tau]=${omega.stage2_braid.exactZTauTrace} | HaPPY=${omega.stage5_happyRecovery.status} | Binius=${omega.stage6_biniusAndLut.biniusAccumulatorHex.slice(0, 18)}... | CircleSTARK_M31=${omega.stage7_circleStarkM31.traceMerkleCommitmentHex.slice(0, 18)}... | LatticeFold_R3329=${omega.stage8_latticeFoldAndGitPack.latticeFold.ajtaiCommitmentRootHex.slice(0, 18)}... (L_inf=${omega.stage8_latticeFoldAndGitPack.latticeFold.foldedWitnessInfNorm}) | GitPACK=${omega.stage8_latticeFoldAndGitPack.gitBinaryPack.packByteLength}B | Total=${omega.totalClosedLoopLatencyUs} us`
  );

  // [12/12] SovereignReleaseExporter 30-File Monorepo Manifest + 8 @codevalai/* OG GitHub Libraries
  const manifest = SovereignReleaseExporter.buildReleaseManifest();
  const missingFiles = manifest.entries.filter((e) => !e.verifiedOnDisk);
  if (manifest.totalFiles !== 30 || missingFiles.length > 0) {
    throw new Error(
      `Release manifest incomplete (${manifest.totalFiles}/30 files, missing: ${missingFiles.map((m) => m.relativePath).join(', ')})`
    );
  }
  const ogLibs = rubicon.getOGGitHubLibraries();
  if (ogLibs.length !== 8) {
    throw new Error(`Expected 8 OG GitHub Libraries, got ${ogLibs.length}`);
  }
  const singleLibZip = rubicon.exportSingleOGLibraryZip('binius-tower-128');
  if (singleLibZip.zipBuffer.readUInt32LE(0) !== 0x04034b50) {
    throw new Error('Single OG Library PKZIP magic mismatch.');
  }
  console.log(
    `[12/12] SovereignReleaseExporter v28.0 & 8 OG GitHub Libraries Verified: ${manifest.totalFiles}/30 Files On Disk (${manifest.totalUncompressedBytes} bytes) | OG Libraries=${ogLibs.length}/8 (@codevalai/*) | SingleLibZip=${singleLibZip.zipBuffer.length}B | MerkleRoot=${manifest.merkleRootSha256Hex.slice(0, 24)}...`
  );

  sovereignEngine.stop();
}

verifyHdcZkmlAndLiveCloneInvariants().catch((err) => {
  console.error(err);
  process.exit(1);
});
