/**
 * @package @codevalai/circle-stark-m31
 * @version 28.0.0
 * @description Mersenne-31 (p = 2^31 - 1) Branchless Arithmetic, Stereographic Circle Group C(M_31),
 * 1.58-Bit Ternary Vanishing Constraint Polynomial, and Twin-Coset Circle FRI Prover.
 * Repository: https://github.com/codevalai/circle-stark-m31
 */

import {
  SovereignMersenne31CircleStark,
  type CircleStarkProofReceipt,
  type CirclePointM31,
} from '../../src/server/SovereignMersenne31CircleStark.js';

export {
  SovereignMersenne31CircleStark,
  type CircleStarkProofReceipt,
  type CirclePointM31,
};

export class CircleStarkM31SDK {
  public static runSelfTest(seedScalar: number = 42): CircleStarkProofReceipt & {
    packageName: '@codevalai/circle-stark-m31';
  } {
    const hv = new Uint32Array(320);
    const wPos = new Uint32Array(320);
    const wNeg = new Uint32Array(320);
    for (let i = 0; i < 320; i++) {
      hv[i] = ((seedScalar + i + 1) * 0x9e3779b9) >>> 0;
      wPos[i] = (hv[i] & 0x55555555) >>> 0;
      wNeg[i] = (~hv[i] & 0x33333333) >>> 0;
    }
    const receipt = SovereignMersenne31CircleStark.proveTernaryExecution(hv, wPos, wNeg);
    return {
      packageName: '@codevalai/circle-stark-m31',
      ...receipt,
    };
  }
}
