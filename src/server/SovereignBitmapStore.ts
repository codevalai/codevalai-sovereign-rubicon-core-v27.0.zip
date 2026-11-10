import * as fs from 'fs';
import { createHash } from 'crypto';
import { SovereignMIDXStore } from './SovereignMIDXStore.js';

export interface EWAHWordInspection {
  wordIndex: number;
  rawHex: string;
  type: 'FILL_RUN' | 'LITERAL_RUN';
  fillBit: 0 | 1;
  runLengthWords: number;
  expandedBitSpan: number;
}

export class SovereignBitmapStore {
  private bitmapBuffer!: Buffer;
  private reachabilityBitmask!: Uint8Array;
  private numObjects = 0;
  private ewahWords: EWAHWordInspection[] = [];

  constructor(private bitmapPath: string | undefined, private midxStore: SovereignMIDXStore) {}

  /**
   * Synthesizes a binary-compliant `.bitmap` v1 file (`PACK` magic 0x5041434B)
   * encoding EWAH compressed fill runs and literal 32-bit words for the given object count.
   */
  public static synthesizeBitmapBuffer(
    numObjects: number,
    reachableIndices: Set<number>
  ): Buffer {
    // Header: 4B 'PACK' + 2B version(1) + 2B flags(1) + 4B numObjects + 20B MIDX checksum = 32B
    const header = Buffer.alloc(32);
    header.writeUInt32BE(0x5041434b, 0); // 'PACK'
    header.writeUInt16BE(1, 4); // Version 1
    header.writeUInt16BE(1, 6); // Flags: BITMAP_OPT_FULL_DAG (1)
    header.writeUInt32BE(numObjects, 8);
    const dummyChecksum = createHash('sha1').update(`MIDX_BITMAP_${numObjects}`).digest();
    dummyChecksum.copy(header, 12);

    // Pack bits into 32-bit words and encode as EWAH control + literal words
    const numWords32 = Math.ceil(Math.max(1, numObjects) / 32);
    const literalWords: number[] = [];

    for (let w = 0; w < numWords32; w++) {
      let wordVal = 0;
      for (let b = 0; b < 32; b++) {
        const bitIdx = w * 32 + b;
        if (reachableIndices.has(bitIdx)) {
          wordVal |= (1 << (31 - b)) >>> 0;
        }
      }
      literalWords.push(wordVal >>> 0);
    }

    // Encode EWAH stream: 1 control word (isFillRun = 0, runLength = literalWords.length) followed by literalWords
    const ewahStreamWords: number[] = [];
    const controlWord = (0x00000000 | (literalWords.length & 0x3fffffff)) >>> 0;
    ewahStreamWords.push(controlWord);
    for (const lw of literalWords) {
      ewahStreamWords.push(lw >>> 0);
    }

    const ewahBuf = Buffer.alloc(4 + ewahStreamWords.length * 4);
    ewahBuf.writeUInt32BE(ewahStreamWords.length, 0);
    ewahStreamWords.forEach((w, idx) => {
      ewahBuf.writeUInt32BE(w >>> 0, 4 + idx * 4);
    });

    return Buffer.concat([header, ewahBuf]);
  }

  /**
   * Initializes and parses the .bitmap file or in-memory buffer, decompressing the EWAH stream
   * into a bitmask array for O(1) reachability lookups.
   */
  public initialize(inMemoryBitmapBuffer?: Buffer): void {
    if (inMemoryBitmapBuffer) {
      this.bitmapBuffer = inMemoryBitmapBuffer;
    } else if (this.bitmapPath) {
      if (!fs.existsSync(this.bitmapPath)) {
        throw new Error(`Bitmap index file not found at path: ${this.bitmapPath}`);
      }
      this.bitmapBuffer = fs.readFileSync(this.bitmapPath);
    } else {
      throw new Error('Must provide bitmapPath or inMemoryBitmapBuffer to SovereignBitmapStore.initialize()');
    }

    this.parseBitmapHeaderAndEWAH();
  }

  private parseBitmapHeaderAndEWAH(): void {
    const signature = this.bitmapBuffer.readUInt32BE(0);
    if (signature !== 0x5041434b) {
      throw new Error('Invalid bitmap file signature. Expected "PACK" (0x5041434B).');
    }

    const version = this.bitmapBuffer.readUInt16BE(4);
    if (version !== 1) {
      throw new Error(`Unsupported bitmap version: ${version}. Version 1 required.`);
    }

    this.numObjects = this.bitmapBuffer.readUInt32BE(8);
    let pos = 32;

    const wordCount = this.bitmapBuffer.readUInt32BE(pos);
    pos += 4;

    const byteLength = Math.max(1, Math.ceil(this.numObjects / 8));
    this.reachabilityBitmask = new Uint8Array(byteLength);
    this.ewahWords = [];

    let currentBitIndex = 0;
    const endPos = pos + wordCount * 4;
    let wordCounter = 0;

    while (pos < endPos && pos + 4 <= this.bitmapBuffer.length) {
      const word = this.bitmapBuffer.readUInt32BE(pos);
      pos += 4;

      const isFillRun = (word & 0x80000000) !== 0;
      const fillBit: 0 | 1 = (word & 0x40000000) !== 0 ? 1 : 0;
      const runLength = word & 0x3fffffff;

      this.ewahWords.push({
        wordIndex: wordCounter++,
        rawHex: `0x${word.toString(16).padStart(8, '0').toUpperCase()}`,
        type: isFillRun ? 'FILL_RUN' : 'LITERAL_RUN',
        fillBit,
        runLengthWords: runLength,
        expandedBitSpan: runLength * 32,
      });

      if (isFillRun) {
        for (let r = 0; r < runLength; r++) {
          for (let b = 0; b < 32; b++) {
            if (currentBitIndex < this.numObjects) {
              if (fillBit === 1) {
                this.setBit(currentBitIndex);
              }
              currentBitIndex++;
            }
          }
        }
      } else {
        for (let r = 0; r < runLength; r++) {
          if (pos + 4 > this.bitmapBuffer.length) break;
          const literalWord = this.bitmapBuffer.readUInt32BE(pos);
          pos += 4;

          for (let b = 0; b < 32; b++) {
            if (currentBitIndex < this.numObjects) {
              const bitSet = (literalWord & (1 << (31 - b))) !== 0;
              if (bitSet) {
                this.setBit(currentBitIndex);
              }
              currentBitIndex++;
            }
          }
        }
      }
    }
  }

  private setBit(index: number): void {
    const byteIndex = Math.floor(index / 8);
    const bitOffset = index % 8;
    this.reachabilityBitmask[byteIndex] |= 1 << (7 - bitOffset);
  }

  public isBitSet(index: number): boolean {
    if (index < 0 || index >= this.numObjects) return false;
    const byteIndex = Math.floor(index / 8);
    const bitOffset = index % 8;
    return (this.reachabilityBitmask[byteIndex] & (1 << (7 - bitOffset))) !== 0;
  }

  /**
   * Performs an instant O(1) reachability query for any object SHA-1 hash
   * by bridging through the MIDX store index mapping.
   */
  public isReachable(sha1Hex: string): { reachable: boolean; midxIndex: number; bitValue: 0 | 1 } {
    try {
      const midxIndex = this.midxStore.findObjectIndex(sha1Hex);
      if (midxIndex === -1) {
        return { reachable: false, midxIndex: -1, bitValue: 0 };
      }
      const reachable = this.isBitSet(midxIndex);
      return {
        reachable,
        midxIndex,
        bitValue: reachable ? 1 : 0,
      };
    } catch {
      return { reachable: false, midxIndex: -1, bitValue: 0 };
    }
  }

  public getBitArray(): Array<{ bitIndex: number; reachable: boolean }> {
    const bits: Array<{ bitIndex: number; reachable: boolean }> = [];
    for (let i = 0; i < this.numObjects; i++) {
      bits.push({ bitIndex: i, reachable: this.isBitSet(i) });
    }
    return bits;
  }

  public getRawBitmask(): Uint8Array {
    return new Uint8Array(this.reachabilityBitmask);
  }

  public getDiagnostics() {
    const bits = this.getBitArray();
    const reachableCount = bits.filter((b) => b.reachable).length;
    return {
      signature: 'PACK (0x5041434B v1 Bitmap)',
      numObjects: this.numObjects,
      reachableCount,
      unreachableCount: this.numObjects - reachableCount,
      bitmapByteSize: this.bitmapBuffer?.length ?? 0,
      ewahWords: this.ewahWords,
      bitmaskArray: bits,
    };
  }
}
