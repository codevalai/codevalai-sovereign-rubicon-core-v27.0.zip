import { SovereignMIDXStore } from './SovereignMIDXStore.js';

export class SovereignBitmapDiff {
  /**
   * Computes the symmetric difference (XOR: A ⊕ B) between two bitmasks.
   * Returns objects that are reachable in either A or B, but not both.
   */
  public static xorDiff(maskA: Uint8Array, maskB: Uint8Array): Uint8Array {
    if (maskA.length !== maskB.length) {
      throw new Error('Bitmask byte lengths must match for vector XOR diffing.');
    }

    const result = new Uint8Array(maskA.length);
    const wordLen = Math.floor(maskA.byteLength / 4);
    const alignedA = maskA.byteOffset % 4 === 0 ? maskA : new Uint8Array(maskA);
    const alignedB = maskB.byteOffset % 4 === 0 ? maskB : new Uint8Array(maskB);

    const viewA = new Uint32Array(alignedA.buffer, alignedA.byteOffset, wordLen);
    const viewB = new Uint32Array(alignedB.buffer, alignedB.byteOffset, wordLen);
    const resultView = new Uint32Array(result.buffer, result.byteOffset, wordLen);

    for (let i = 0; i < wordLen; i++) {
      resultView[i] = viewA[i] ^ viewB[i];
    }

    for (let i = wordLen * 4; i < maskA.length; i++) {
      result[i] = maskA[i] ^ maskB[i];
    }

    return result;
  }

  /**
   * Computes the set difference (A \ B): Objects reachable in A but NOT in B.
   * Essential for finding new commits/blobs introduced in a branch delta.
   */
  public static setDifference(maskA: Uint8Array, maskB: Uint8Array): Uint8Array {
    if (maskA.length !== maskB.length) {
      throw new Error('Bitmask byte lengths must match for set difference.');
    }

    const result = new Uint8Array(maskA.length);
    const wordLen = Math.floor(maskA.byteLength / 4);
    const alignedA = maskA.byteOffset % 4 === 0 ? maskA : new Uint8Array(maskA);
    const alignedB = maskB.byteOffset % 4 === 0 ? maskB : new Uint8Array(maskB);

    const viewA = new Uint32Array(alignedA.buffer, alignedA.byteOffset, wordLen);
    const viewB = new Uint32Array(alignedB.buffer, alignedB.byteOffset, wordLen);
    const resultView = new Uint32Array(result.buffer, result.byteOffset, wordLen);

    for (let i = 0; i < wordLen; i++) {
      resultView[i] = viewA[i] & ~viewB[i];
    }

    for (let i = wordLen * 4; i < maskA.length; i++) {
      result[i] = maskA[i] & ~maskB[i];
    }

    return result;
  }

  /**
   * Decodes a difference bitmask back into an array of Git object SHA-1 hex hashes
   * by querying the MIDX store OID table at set bit indices.
   */
  public static resolveObjectHashes(
    diffMask: Uint8Array,
    midxStore: SovereignMIDXStore
  ): string[] {
    const objectHashes: string[] = [];
    const numBytes = diffMask.length;

    for (let byteIdx = 0; byteIdx < numBytes; byteIdx++) {
      const byte = diffMask[byteIdx];
      if (byte === 0) continue;

      for (let bitOffset = 0; bitOffset < 8; bitOffset++) {
        const isSet = (byte & (1 << (7 - bitOffset))) !== 0;
        if (isSet) {
          const globalIndex = byteIdx * 8 + bitOffset;
          const sha1Hex = midxStore.getOIDByIndex(globalIndex);
          if (sha1Hex) {
            objectHashes.push(sha1Hex);
          }
        }
      }
    }

    return objectHashes;
  }
}
