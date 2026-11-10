/**
 * @package @codevalai/binius-tower-128
 * @version 28.0.0
 * @description Binius GF(2^128) Wiedemann Binary-Tower Field Prover, Karatsuba-Tower Multiplication,
 * In-Place Radix-2 Additive Cantor NTT, and Multilinear Sumcheck Hypervector Folding.
 * Repository: https://github.com/codevalai/binius-tower-128
 */

import {
  SovereignBiniusTowerProver,
  gf2TowerMul,
  gf2Tower128Mul,
  type BiniusTowerProofReceipt,
  type AdditiveCantorNttProof,
} from '../../src/server/SovereignBiniusTowerProver.js';

export {
  SovereignBiniusTowerProver,
  gf2TowerMul,
  gf2Tower128Mul,
  type BiniusTowerProofReceipt,
  type AdditiveCantorNttProof,
};

export class BiniusTower128SDK {
  public static runSelfTest(instanceCount: number = 64): BiniusTowerProofReceipt & {
    packageName: '@codevalai/binius-tower-128';
    multiplicativeAssociativityVerified: boolean;
  } {
    const a = 0x89abcdef0fedcba9n;
    const b = 0x7f4a7c15f39cc060n;
    const c = 0xc2b2ae3527d4eb2fn;

    const ab_c = gf2TowerMul(gf2TowerMul(a, b, 64), c, 64);
    const a_bc = gf2TowerMul(a, gf2TowerMul(b, c, 64), 64);

    const hvs: Uint32Array[] = [];
    for (let i = 0; i < Math.min(32, Math.max(4, instanceCount)); i++) {
      const hv = new Uint32Array(320);
      for (let w = 0; w < 320; w++) {
        hv[w] = ((i + 1) * 0x9e3779b9 ^ (w * 0x85ebca6b)) >>> 0;
      }
      hvs.push(hv);
    }

    const receipt = SovereignBiniusTowerProver.foldHypervectors(hvs, 0x9e3779b97f4a7c15n);
    return {
      packageName: '@codevalai/binius-tower-128',
      multiplicativeAssociativityVerified: ab_c === a_bc,
      ...receipt,
    };
  }
}
