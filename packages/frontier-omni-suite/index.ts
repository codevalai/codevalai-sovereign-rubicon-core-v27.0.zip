/**
 * @package @codevalai/frontier-omni-suite
 * @version 28.0.0
 * @description Unified Deep-Tech Frontier Primitives:
 *   1. Relativistic Mars Luby Transform (LT) Rateless Fountain Peeling Decoder
 *   2. d=9 Rotated Surface Code Union-Find (Disjoint-Set) Anyon Peeling Decoder
 *   3. Quaternary GF(4) Gray-Code CRISPR Oligo Codec with Rotating Modulo-3 RLL
 *   4. 4th-Order Yoshida Symplectic J2 Oblate Spheroid Orbital Integrator
 * Repository: https://github.com/codevalai/frontier-omni-suite
 */

import {
  SovereignMarsLTFountain,
  type LTFountainDecodeReport,
} from '../../include/SovereignMarsLTFountain.js';
import {
  SovereignUnionFindQubits,
  type SurfaceCodeDecodeReport,
} from '../../include/SovereignUnionFindQubits.js';
import {
  SovereignQuaternaryCRISPR,
  type CRISPRPayloadReport,
} from '../../include/SovereignQuaternaryCRISPR.js';
import {
  SovereignSymplecticYoshida,
  type YoshidaPropagationReport,
} from '../../include/SovereignSymplecticYoshida.js';

export {
  SovereignMarsLTFountain,
  type LTFountainDecodeReport,
  SovereignUnionFindQubits,
  type SurfaceCodeDecodeReport,
  SovereignQuaternaryCRISPR,
  type CRISPRPayloadReport,
  SovereignSymplecticYoshida,
  type YoshidaPropagationReport,
};

export class FrontierOmniSuiteSDK {
  public static runSelfTest(): {
    packageName: '@codevalai/frontier-omni-suite';
    marsLtFountain: LTFountainDecodeReport;
    surfaceCodeUnionFind: SurfaceCodeDecodeReport;
    crisprQuaternaryHdc: CRISPRPayloadReport;
    yoshidaSymplecticOrbit: YoshidaPropagationReport;
    allInvariantsVerified: boolean;
    executionLatencyUs: number;
  } {
    const t0 = performance.now();
    const sampleHv = new Uint32Array(320);
    for (let i = 0; i < 320; i++) {
      sampleHv[i] = (0x9e3779b9 ^ (i * 0x85ebca6b)) >>> 0;
    }

    const sourceBlocks: Uint32Array[] = Array.from({ length: 8 }, (_, idx) => {
      const blk = new Uint32Array(320);
      for (let w = 0; w < 320; w++) {
        blk[w] = (sampleHv[w] ^ ((idx + 1) * 0x9e3779b9)) >>> 0;
      }
      return blk;
    });
    const droplets = SovereignMarsLTFountain.encodeDroplets(sourceBlocks, 24);
    const marsLtFountain = SovereignMarsLTFountain.decodeDroplets(
      droplets.slice(0, 14),
      8,
      sourceBlocks
    );

    const surfaceCodeUnionFind = SovereignUnionFindQubits.decodePlanarSurfaceCode(9);

    const crisprBytes = new Uint8Array(sampleHv.buffer, sampleHv.byteOffset, 64);
    const crisprQuaternaryHdc = SovereignQuaternaryCRISPR.verifySyntheticArchive(
      crisprBytes,
      sampleHv
    );

    const yoshidaSymplecticOrbit = SovereignSymplecticYoshida.propagateOrbit(200, 1.0);

    return {
      packageName: '@codevalai/frontier-omni-suite',
      marsLtFountain,
      surfaceCodeUnionFind,
      crisprQuaternaryHdc,
      yoshidaSymplecticOrbit,
      allInvariantsVerified:
        marsLtFountain.bitExactRecovery &&
        surfaceCodeUnionFind.logicalChannelFidelity &&
        crisprQuaternaryHdc.bijectiveRoundtripVerified &&
        yoshidaSymplecticOrbit.symplecticInvariantPreserved,
      executionLatencyUs: Number(((performance.now() - t0) * 1000).toFixed(2)),
    };
  }
}
