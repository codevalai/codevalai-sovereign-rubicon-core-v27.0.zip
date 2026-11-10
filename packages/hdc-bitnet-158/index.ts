/**
 * @package @codevalai/hdc-bitnet-158
 * @version 28.0.0
 * @description 10,240-Bit SHAKE-256 Orthogonal Hyperdimensional Computing (320 x Uint32Array),
 * Dual-Plane Bit-Sliced 1.58-Bit Ternary ALU ({-1, 0, +1}), and Kanerva SDM Hopfield Attractor.
 * Repository: https://github.com/codevalai/hdc-bitnet-158
 */

import { SovereignHDC158Engine } from '../../src/server/SovereignHDC158Engine.js';
import {
  bitSlicedTernaryDot10240,
  unrolledBitmapXorDiff320,
} from '../../src/server/SovereignZenithV25Core.js';
import {
  SovereignKanervaSDM,
  type KanervaSDMConvergenceReport,
} from '../../include/SovereignKanervaSDM.js';

export {
  SovereignHDC158Engine,
  bitSlicedTernaryDot10240,
  unrolledBitmapXorDiff320,
  SovereignKanervaSDM,
  type KanervaSDMConvergenceReport,
};

export class HdcBitNet158SDK {
  public static runSelfTest(symbolSeed: string = 'SovereignLatticeCore:v28.0'): {
    packageName: '@codevalai/hdc-bitnet-158';
    symbolSeed: string;
    hypervectorBits: 10240;
    selfSimilarity: number;
    orthogonalSimilarity: number;
    dualPlaneTernaryScore: number;
    kanervaSdmReceipt: KanervaSDMConvergenceReport;
    executionLatencyUs: number;
  } {
    const t0 = performance.now();
    const engine = new SovereignHDC158Engine();
    const hvA = engine.encodeHypervector(symbolSeed);
    const hvB = engine.encodeHypervector(`${symbolSeed}:orthogonal`);

    const selfSim = engine.computeHDCSimilarity(hvA, hvA);
    const orthoSim = engine.computeHDCSimilarity(hvA, hvB);

    const hvWords = new Uint32Array(320);
    const orthoWords = new Uint32Array(320);
    const wPos = new Uint32Array(320);
    const wNeg = new Uint32Array(320);
    for (let i = 0; i < 320; i++) {
      hvWords[i] = (0x9e3779b9 ^ (i * 0x85ebca6b)) >>> 0;
      orthoWords[i] = (hvWords[i] ^ 0xa5a5a5a5) >>> 0;
      wPos[i] = (0x55555555 ^ (i * 0x85ebca6b)) >>> 0;
      wNeg[i] = (~wPos[i] & 0x33333333) >>> 0;
    }
    const ternaryScore = bitSlicedTernaryDot10240(hvWords, wPos, wNeg);
    const kanervaSdmReceipt = SovereignKanervaSDM.verifyAssociativeRecall(
      hvWords,
      [orthoWords],
      0.35
    );

    return {
      packageName: '@codevalai/hdc-bitnet-158',
      symbolSeed,
      hypervectorBits: 10240,
      selfSimilarity: selfSim,
      orthogonalSimilarity: orthoSim,
      dualPlaneTernaryScore: ternaryScore,
      kanervaSdmReceipt,
      executionLatencyUs: Number(((performance.now() - t0) * 1000).toFixed(2)),
    };
  }
}
