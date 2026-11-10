/**
 * @package @codevalai/latticefold-ringsis
 * @version 28.0.0
 * @description Post-Quantum Ring-SIS LatticeFold over Cyclotomic Ring R_3329 = Z_3329[X]/(X^256 + 1),
 * 256-Point Cooley-Tukey Negacyclic NTT (zeta = 17), and Ajtai Short-Norm Folding Verifier.
 * Repository: https://github.com/codevalai/latticefold-ringsis
 */

import {
  SovereignLatticeFoldProver,
  type LatticeFoldReceipt,
} from '../../src/server/SovereignLatticeFoldProver.js';

export {
  SovereignLatticeFoldProver,
  type LatticeFoldReceipt,
};

export class LatticeFoldRingSisSDK {
  public static runSelfTest(challengeSeed: number = 17): LatticeFoldReceipt & {
    packageName: '@codevalai/latticefold-ringsis';
  } {
    const hvA = new Uint32Array(320);
    const hvB = new Uint32Array(320);
    for (let i = 0; i < 320; i++) {
      hvA[i] = ((challengeSeed + i) * 0x9e3779b9) >>> 0;
      hvB[i] = ((challengeSeed + i + 19) * 0x85ebca6b) >>> 0;
    }
    const receipt = SovereignLatticeFoldProver.foldShortLatticeWitnesses(
      hvA,
      hvB,
      challengeSeed
    );
    return {
      packageName: '@codevalai/latticefold-ringsis',
      ...receipt,
    };
  }
}
