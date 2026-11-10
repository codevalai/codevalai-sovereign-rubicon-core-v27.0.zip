// include/shaders/SovereignWGPUHypergrid.wgsl
// Sovereign Omni-Apex v25.0 — 1,000,000-Commit 10,240-Bit HDC & 1.58-Bit Ternary Compute Kernel

struct HypergridUniforms {
  commitCount: u32,        // Number of commits in current slab (e.g., 250,000 or 1,000,000)
  globalCommitOffset: u32, // Offset for multi-slab dispatch
  hammingThreshold: u32,   // Max Hamming distance for candidate emission (e.g., 4600)
  ternaryBias: i32,        // Fixed-point bias for 1.58-bit layer
};

struct TelemetryResult {
  bestPackedMatch: atomic<u32>, // Upper 14 bits: Hamming distance | Lower 18 bits: Local Commit Index
  bestTernaryScore: atomic<i32>,
  thresholdHits: atomic<u32>,
  xorChecksum: atomic<u32>,
};

// 80 x vec4<u32> = 320 x u32 = 10,240 bits per commit
const VEC4_WORDS_PER_COMMIT: u32 = 80u;
const WORKGROUP_SIZE: u32 = 256u;

@group(0) @binding(0) var<uniform> params: HypergridUniforms;
@group(0) @binding(1) var<storage, read> queryAndWeights: array<vec4<u32>, 240>; // [0..79]=Query, [80..159]=W_pos, [160..239]=W_neg
@group(0) @binding(2) var<storage, read> commitCorpus: array<vec4<u32>>;         // N * 80 vec4<u32> words
@group(0) @binding(3) var<storage, read_write> telemetry: TelemetryResult;
@group(0) @binding(4) var<storage, read_write> compactScoresOut: array<i32>;     // Packed [Hamming16 | Ternary16] per commit

// L1 Workgroup SRAM Cache (3 x 1,280 bytes = 3,840 bytes — fits well inside 16KB/64KB shared memory)
var<workgroup> sharedQuery: array<vec4<u32>, 80>;
var<workgroup> sharedWPos: array<vec4<u32>, 80>;
var<workgroup> sharedWNeg: array<vec4<u32>, 80>;

@compute @workgroup_size(256, 1, 1)
fn main(
  @builtin(global_invocation_id) global_id: vec3<u32>,
  @builtin(local_invocation_id) local_id: vec3<u32>,
  @builtin(num_workgroups) num_wgs: vec3<u32>
) {
  let tid = local_id.x;

  // 1. Cooperative L1 Workgroup SRAM Preload (240 vec4<u32> words loaded by first 240 threads in 1 cycle)
  if (tid < 80u) {
    sharedQuery[tid] = queryAndWeights[tid];
    sharedWPos[tid]  = queryAndWeights[tid + 80u];
    sharedWNeg[tid]  = queryAndWeights[tid + 160u];
  }
  workgroupBarrier();

  // 2. 2D Grid-Stride / Flat Thread Indexing to support >65,535 workgroups (up to 1,000,000+ commits)
  let commitIdx = global_id.y * (num_wgs.x * WORKGROUP_SIZE) + global_id.x;
  if (commitIdx >= params.commitCount) {
    return;
  }

  let baseOffset = commitIdx * VEC4_WORDS_PER_COMMIT;
  var hammingAcc: u32 = 0u;
  var posDotAcc: u32 = 0u;
  var negDotAcc: u32 = 0u;
  var rollingFold: u32 = 0u;

  // 3. Unrolled 80-vec4<u32> (10,240-bit) Fused SWAR Hamming + 1.58-Bit Ternary Evaluation
  for (var w: u32 = 0u; w < VEC4_WORDS_PER_COMMIT; w = w + 4u) {
    let c0 = commitCorpus[baseOffset + w];
    let c1 = commitCorpus[baseOffset + w + 1u];
    let c2 = commitCorpus[baseOffset + w + 2u];
    let c3 = commitCorpus[baseOffset + w + 3u];

    // Hardware vec4 popcount for Hamming distance against Query Hypervector
    let h0 = countOneBits(c0 ^ sharedQuery[w]);
    let h1 = countOneBits(c1 ^ sharedQuery[w + 1u]);
    let h2 = countOneBits(c2 ^ sharedQuery[w + 2u]);
    let h3 = countOneBits(c3 ^ sharedQuery[w + 3u]);

    hammingAcc += (h0.x + h0.y + h0.z + h0.w) +
                  (h1.x + h1.y + h1.z + h1.w) +
                  (h2.x + h2.y + h2.z + h2.w) +
                  (h3.x + h3.y + h3.z + h3.w);

    // Hardware vec4 popcount for Positive (+1) Ternary Plane
    let p0 = countOneBits(c0 & sharedWPos[w]);
    let p1 = countOneBits(c1 & sharedWPos[w + 1u]);
    let p2 = countOneBits(c2 & sharedWPos[w + 2u]);
    let p3 = countOneBits(c3 & sharedWPos[w + 3u]);

    posDotAcc += (p0.x + p0.y + p0.z + p0.w) +
                 (p1.x + p1.y + p1.z + p1.w) +
                 (p2.x + p2.y + p2.z + p2.w) +
                 (p3.x + p3.y + p3.z + p3.w);

    // Hardware vec4 popcount for Negative (-1) Ternary Plane
    let n0 = countOneBits(c0 & sharedWNeg[w]);
    let n1 = countOneBits(c1 & sharedWNeg[w + 1u]);
    let n2 = countOneBits(c2 & sharedWNeg[w + 2u]);
    let n3 = countOneBits(c3 & sharedWNeg[w + 3u]);

    negDotAcc += (n0.x + n0.y + n0.z + n0.w) +
                 (n1.x + n1.y + n1.z + n1.w) +
                 (n2.x + n2.y + n2.z + n2.w) +
                 (n3.x + n3.y + n3.z + n3.w);

    rollingFold ^= (c0.x ^ c1.y ^ c2.z ^ c3.w);
  }

  let ternaryInferenceScore: i32 = i32(posDotAcc) - i32(negDotAcc) + params.ternaryBias;

  // 4. Pack 16-bit Hamming Distance + 16-bit Signed Ternary Score into single 32-bit output word
  let clampedTernary = clamp(ternaryInferenceScore, -32768, 32767) & 0xFFFF;
  compactScoresOut[commitIdx] = i32((hammingAcc << 16u) | u32(clampedTernary));

  // 5. Lock-Free Atomic Reduction for Top-1 Recall & Threshold Telemetry
  if (hammingAcc <= params.hammingThreshold) {
    atomicAdd(&telemetry.thresholdHits, 1u);
    atomicMax(&telemetry.bestTernaryScore, ternaryInferenceScore);
    atomicXor(&telemetry.xorChecksum, rollingFold);

    // Pack [14-bit Hamming Distance (0..10240) | 18-bit Local Commit ID (0..262143)]
    let packedKey = ((hammingAcc & 0x3FFFu) << 18u) | (commitIdx & 0x3FFFFu);
    atomicMin(&telemetry.bestPackedMatch, packedKey);
  }
}
