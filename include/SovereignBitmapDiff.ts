/**
 * @file include/SovereignBitmapDiff.ts
 * @version 26.1.0 (Vectorized 32-Bit Uint32Array Roaring/EWAH Reachability Bitmap Algebra)
 * @description Hardware-speed 32-bit word-level XOR, AND-NOT set difference, and SWAR popcount
 * reachability filtering mapped directly to SovereignMIDXHypergrid OIDs.
 */

import { SovereignMIDXHypergrid } from './SovereignMIDXHypergrid.js';

export class SovereignBitmapDiff {
  public static popcount32(x: number): number {
    x = x - ((x >>> 1) & 0x55555555);
    x = (x & 0x33333333) + ((x >>> 2) & 0x33333333);
    return (((x + (x >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24;
  }

  public static xorDiffWords(maskA: Uint32Array, maskB: Uint32Array): { diff: Uint32Array; activeBits: number } {
    const len = Math.min(maskA.length, maskB.length);
    const diff = new Uint32Array(len);
    let activeBits = 0;
    for (let i = 0; i < len; i++) {
      const w = (maskA[i] ^ maskB[i]) >>> 0;
      diff[i] = w;
      activeBits += this.popcount32(w);
    }
    return { diff, activeBits };
  }

  public static setDifferenceWords(maskA: Uint32Array, maskB: Uint32Array): { diff: Uint32Array; activeBits: number } {
    const len = Math.min(maskA.length, maskB.length);
    const diff = new Uint32Array(len);
    let activeBits = 0;
    for (let i = 0; i < len; i++) {
      const w = (maskA[i] & ~maskB[i]) >>> 0;
      diff[i] = w;
      activeBits += this.popcount32(w);
    }
    return { diff, activeBits };
  }

  public static resolveReachableOids(diffWords: Uint32Array, midx: SovereignMIDXHypergrid): string[] {
    const oids: string[] = [];
    for (let wIdx = 0; wIdx < diffWords.length; wIdx++) {
      let word = diffWords[wIdx];
      while (word !== 0) {
        const lsb = word & -word;
        const bitPos = 31 - Math.clz32(lsb);
        const globalIdx = wIdx * 32 + bitPos;
        const oid = midx.getOIDByIndex(globalIdx);
        if (oid) oids.push(oid);
        word ^= lsb;
      }
    }
    return oids;
  }
}
