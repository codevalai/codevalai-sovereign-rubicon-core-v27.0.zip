/**
 * @file include/SovereignLatticeFoldProver.ts
 * @version 27.0.0 (Post-Quantum Ring-SIS LatticeFold over R_q = Z_3329[X]/(X^256 + 1))
 * @description Real Number-Theoretic Transform (Cooley-Tukey NTT over Z_3329 with primitive root zeta=17),
 * Ajtai Short-Integer-Solution (Ring-SIS) homomorphic commitment t = A * s mod q, and
 * norm-bounded linear folding s_folded = s_1 + c * s_2 with L_infinity norm verification.
 */

import { createHash } from 'crypto';

export const LATTICE_Q = 3329;
export const LATTICE_N = 256;
export const LATTICE_ZETA = 17; // 17^128 === -1 (mod 3329)

export interface LatticeFoldReceipt {
  ringSpec: 'Z_3329[X] / (X^256 + 1)';
  sisNormBoundBeta: number;
  foldedWitnessInfNorm: number;
  foldedWitnessL2Norm: number;
  normBoundSatisfied: boolean;
  homomorphicRelationVerified: boolean;
  ajtaiCommitmentRootHex: string;
  nttSampleCoefficients: number[];
  executionLatencyUs: number;
}

export class SovereignLatticeFoldProver {
  private static readonly zetas: Int16Array = SovereignLatticeFoldProver.precomputeZetas();

  private static modPow(base: number, exp: number, mod: number): number {
    let res = 1;
    let b = ((base % mod) + mod) % mod;
    let e = exp;
    while (e > 0) {
      if (e & 1) res = (res * b) % mod;
      b = (b * b) % mod;
      e >>>= 1;
    }
    return res;
  }

  private static bitRev7(x: number): number {
    let r = 0;
    for (let i = 0; i < 7; i++) {
      r = (r << 1) | ((x >>> i) & 1);
    }
    return r;
  }

  private static precomputeZetas(): Int16Array {
    const table = new Int16Array(128);
    for (let i = 0; i < 128; i++) {
      table[i] = this.modPow(LATTICE_ZETA, this.bitRev7(i), LATTICE_Q);
    }
    return table;
  }

  /**
   * Executes FIPS 203 / Kyber-style Cooley-Tukey Forward NTT in Z_3329[X]/(X^256 + 1).
   */
  public static forwardNTT(poly: Int32Array): Int32Array {
    const r = new Int32Array(poly);
    let k = 1;
    for (let len = 128; len >= 2; len >>>= 1) {
      for (let start = 0; start < 256; start += 2 * len) {
        const zeta = this.zetas[k++];
        for (let j = start; j < start + len; j++) {
          const t = (zeta * r[j + len]) % LATTICE_Q;
          r[j + len] = (((r[j] - t) % LATTICE_Q) + LATTICE_Q) % LATTICE_Q;
          r[j] = (((r[j] + t) % LATTICE_Q) + LATTICE_Q) % LATTICE_Q;
        }
      }
    }
    return r;
  }

  /**
   * Pointwise addition in R_q (NTT or coefficient domain).
   */
  public static polyAddModQ(a: Int32Array, b: Int32Array): Int32Array {
    const out = new Int32Array(LATTICE_N);
    for (let i = 0; i < LATTICE_N; i++) {
      out[i] = (((a[i] + b[i]) % LATTICE_Q) + LATTICE_Q) % LATTICE_Q;
    }
    return out;
  }

  /**
   * Scalar-polynomial multiplication mod q.
   */
  public static polyScalarMulModQ(a: Int32Array, scalar: number): Int32Array {
    const out = new Int32Array(LATTICE_N);
    for (let i = 0; i < LATTICE_N; i++) {
      out[i] = (((a[i] * scalar) % LATTICE_Q) + LATTICE_Q) % LATTICE_Q;
    }
    return out;
  }

  /**
   * Executes Ring-SIS LatticeFold over two short ternary hypervector witnesses s1, s2 in {-1, 0, 1}^256,
   * verifying homomorphic linearity NTT(s1 + c*s2) === NTT(s1) + c*NTT(s2) (mod 3329)
   * and checking the Short Integer Solution L_infinity norm bound.
   */
  public static foldShortLatticeWitnesses(
    hvWordsA: Uint32Array,
    hvWordsB: Uint32Array,
    challengeScalar: number = 7
  ): LatticeFoldReceipt {
    const t0 = process.hrtime.bigint();
    const s1 = new Int32Array(LATTICE_N);
    const s2 = new Int32Array(LATTICE_N);

    for (let i = 0; i < LATTICE_N; i++) {
      const bitsA = (hvWordsA[i % hvWordsA.length] >>> (i % 30)) & 3;
      const bitsB = (hvWordsB[i % hvWordsB.length] >>> (i % 30)) & 3;
      s1[i] = bitsA === 1 ? 1 : bitsA === 2 ? -1 : 0;
      s2[i] = bitsB === 1 ? 1 : bitsB === 2 ? -1 : 0;
    }

    const c = (challengeScalar % 11) + 2; // Bounded folding challenge in [2..12]
    const sFolded = new Int32Array(LATTICE_N);
    let maxInfNorm = 0;
    let sumSq = 0;

    for (let i = 0; i < LATTICE_N; i++) {
      const val = s1[i] + c * s2[i];
      sFolded[i] = val;
      const absVal = Math.abs(val);
      if (absVal > maxInfNorm) maxInfNorm = absVal;
      sumSq += val * val;
    }

    // Verify homomorphic linearity of the NTT Ajtai commitment in Z_3329[X]/(X^256 + 1)
    const ntt1 = this.forwardNTT(s1);
    const ntt2 = this.forwardNTT(s2);
    const nttFoldedDirect = this.forwardNTT(sFolded);
    const nttFoldedHomomorphic = this.polyAddModQ(ntt1, this.polyScalarMulModQ(ntt2, c));

    let homomorphicExact = true;
    for (let i = 0; i < LATTICE_N; i++) {
      if (nttFoldedDirect[i] !== nttFoldedHomomorphic[i]) {
        homomorphicExact = false;
        break;
      }
    }

    // Ajtai matrix A multiplication in NTT domain: t_hat[i] = A_hat[i] * nttFoldedDirect[i] mod 3329
    const ajtaiT = new Int32Array(LATTICE_N);
    for (let i = 0; i < LATTICE_N; i++) {
      const aHat = ((i * 1999 + 743) % (LATTICE_Q - 1)) + 1;
      ajtaiT[i] = (aHat * nttFoldedDirect[i]) % LATTICE_Q;
    }

    const ajtaiBytes = Buffer.from(ajtaiT.buffer, ajtaiT.byteOffset, ajtaiT.byteLength);
    const ajtaiCommitmentRootHex = `0xajtai_sis_${createHash('sha3-256')
      .update(ajtaiBytes)
      .digest('hex')
      .slice(0, 40)}`;

    const sisNormBoundBeta = 64; // Short vector norm bound << q/2 (1664)
    const latencyUs = Number(process.hrtime.bigint() - t0) / 1000;

    return {
      ringSpec: 'Z_3329[X] / (X^256 + 1)',
      sisNormBoundBeta,
      foldedWitnessInfNorm: maxInfNorm,
      foldedWitnessL2Norm: Number(Math.sqrt(sumSq).toFixed(4)),
      normBoundSatisfied: maxInfNorm <= sisNormBoundBeta,
      homomorphicRelationVerified: homomorphicExact,
      ajtaiCommitmentRootHex,
      nttSampleCoefficients: Array.from(ajtaiT.subarray(0, 8)),
      executionLatencyUs: Number(latencyUs.toFixed(2)),
    };
  }
}
