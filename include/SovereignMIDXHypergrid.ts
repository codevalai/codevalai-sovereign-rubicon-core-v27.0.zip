/**
 * @file include/SovereignMIDXHypergrid.ts
 * @version 26.1.0 (Multi-Pack Index OIDF 256-Entry Fanout & Binary OID Search Engine)
 * @description Real Git v2/MIDX 256-entry first-byte fanout table and O(log(N/256)) binary search
 * over sorted 20-byte SHA-1 / 32-byte SHA-256 object IDs mapped to CXL 3.0 slab offsets.
 */

export interface MIDXLookupResult {
  oidHex: string;
  globalPackIndex: number;
  cxlByteOffset: number;
  fanoutBucket: number;
  binarySearchSteps: number;
}

export class SovereignMIDXHypergrid {
  private readonly fanoutTable = new Uint32Array(256);
  private readonly sortedOids: string[] = [];
  private readonly cxlByteOffsets: Uint32Array;

  constructor(oidList: string[]) {
    const uniqueSorted = Array.from(new Set(oidList.map((s) => s.toLowerCase()))).sort();
    this.sortedOids = uniqueSorted;
    this.cxlByteOffsets = new Uint32Array(uniqueSorted.length);

    let cursor = 0;
    for (let bucket = 0; bucket < 256; bucket++) {
      while (cursor < uniqueSorted.length) {
        const firstByte = parseInt(uniqueSorted[cursor].slice(0, 2), 16);
        if (firstByte <= bucket) {
          cursor++;
        } else {
          break;
        }
      }
      this.fanoutTable[bucket] = cursor;
    }

    for (let i = 0; i < uniqueSorted.length; i++) {
      this.cxlByteOffsets[i] = i * 1280; // 20 x 64-byte cachelines per commit
    }
  }

  public lookupOid(oidHex: string): MIDXLookupResult | null {
    const norm = oidHex.toLowerCase();
    const bucket = parseInt(norm.slice(0, 2), 16);
    if (Number.isNaN(bucket) || bucket < 0 || bucket > 255) return null;

    let lo = bucket === 0 ? 0 : this.fanoutTable[bucket - 1];
    let hi = this.fanoutTable[bucket] - 1;
    let steps = 0;

    while (lo <= hi) {
      steps++;
      const mid = (lo + hi) >>> 1;
      const cmp = this.sortedOids[mid];
      if (cmp === norm) {
        return {
          oidHex: norm,
          globalPackIndex: mid,
          cxlByteOffset: this.cxlByteOffsets[mid],
          fanoutBucket: bucket,
          binarySearchSteps: steps,
        };
      } else if (cmp < norm) {
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    return null;
  }

  public getOIDByIndex(globalIndex: number): string | null {
    if (globalIndex < 0 || globalIndex >= this.sortedOids.length) return null;
    return this.sortedOids[globalIndex];
  }

  public getTotalObjects(): number {
    return this.sortedOids.length;
  }
}
