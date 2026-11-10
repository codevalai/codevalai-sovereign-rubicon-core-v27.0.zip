import * as fs from 'fs';
import * as zlib from 'zlib';
import { createHash } from 'crypto';

export interface PackObject {
  sha1Hex: string;
  type: 'commit' | 'tree' | 'blob' | 'tag' | 'ofs_delta' | 'ref_delta';
  size: number;
  packOffset: number;
  compressedBytes: number;
  crc32: number;
  data: Buffer;
}

export interface RawGitObjectInput {
  type: 'commit' | 'tree' | 'blob' | 'tag';
  content: Buffer | string;
}

export class SovereignPackStore {
  private packBuffer!: Buffer;
  private idxBuffer!: Buffer;
  private numObjects = 0;
  private fanoutTable: Uint32Array;
  private sha1TableOffset = 0;
  private crcTableOffset = 0;
  private offsetTableOffset = 0;

  constructor(private packPath?: string) {
    this.fanoutTable = new Uint32Array(256);
  }

  /**
   * Computes a standard IEEE 802.3 CRC32 checksum for Git Pack Index v2 entries.
   */
  public static computeCRC32(buf: Buffer): number {
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      crc ^= buf[i];
      for (let j = 0; j < 8; j++) {
        crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
      }
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  /**
   * Synthesizes an authentic, binary-compliant Git Packfile v2 (`PACK`) and Index v2 (`\377tOc`)
   * in memory from an array of Git objects.
   */
  public static synthesizePackAndIdxBuffers(
    rawObjects: RawGitObjectInput[]
  ): {
    packBuffer: Buffer;
    idxBuffer: Buffer;
    manifest: Array<{ sha1Hex: string; type: PackObject['type']; size: number; packOffset: number; crc32: number }>;
  } {
    const typeCodeMap: Record<RawGitObjectInput['type'], number> = {
      commit: 1,
      tree: 2,
      blob: 3,
      tag: 4,
    };

    const prepared = rawObjects.map((obj) => {
      const contentBuf = Buffer.isBuffer(obj.content) ? obj.content : Buffer.from(obj.content, 'utf8');
      const gitHeader = Buffer.from(`${obj.type} ${contentBuf.length}\0`, 'utf8');
      const sha1Buf = createHash('sha1').update(gitHeader).update(contentBuf).digest();
      const sha1Hex = sha1Buf.toString('hex');

      // Encode variable-length Git pack object header: [MSB][3-bit type][4-bit size LSBs] ...
      const typeInt = typeCodeMap[obj.type];
      let size = contentBuf.length;
      const headerBytes: number[] = [];
      let firstByte = ((typeInt & 0x07) << 4) | (size & 0x0f);
      size >>>= 4;
      while (size > 0) {
        headerBytes.push(firstByte | 0x80);
        firstByte = size & 0x7f;
        size >>>= 7;
      }
      headerBytes.push(firstByte);

      const objHeaderBuf = Buffer.from(headerBytes);
      const compressedBuf = zlib.deflateSync(contentBuf);
      const packEntryBuf = Buffer.concat([objHeaderBuf, compressedBuf]);
      const crc32 = this.computeCRC32(packEntryBuf);

      return {
        sha1Buf,
        sha1Hex,
        type: obj.type,
        size: contentBuf.length,
        packEntryBuf,
        crc32,
      };
    });

    // Build .pack v2 binary buffer: 'PACK' (4B) + Version 2 (4B) + NumObjects (4B) + Entries + 20B SHA1 Trailer
    const packHeader = Buffer.alloc(12);
    packHeader.write('PACK', 0, 4, 'ascii');
    packHeader.writeUInt32BE(2, 4);
    packHeader.writeUInt32BE(prepared.length, 8);

    let currentPackOffset = 12;
    const entryBuffers: Buffer[] = [packHeader];
    const indexedEntries = prepared.map((item) => {
      const offset = currentPackOffset;
      currentPackOffset += item.packEntryBuf.length;
      entryBuffers.push(item.packEntryBuf);
      return {
        ...item,
        packOffset: offset,
      };
    });

    const packBody = Buffer.concat(entryBuffers);
    const packChecksum = createHash('sha1').update(packBody).digest();
    const packBuffer = Buffer.concat([packBody, packChecksum]);

    // Sort objects lexicographically by 20-byte SHA-1 for Index v2 (\377tOc)
    const sorted = [...indexedEntries].sort((a, b) => a.sha1Buf.compare(b.sha1Buf));

    // Build 256-entry Fan-Out table
    const fanout = new Uint32Array(256);
    let count = 0;
    let sortedIdx = 0;
    for (let byteVal = 0; byteVal < 256; byteVal++) {
      while (sortedIdx < sorted.length && sorted[sortedIdx].sha1Buf[0] === byteVal) {
        count++;
        sortedIdx++;
      }
      fanout[byteVal] = count;
    }

    const idxHeader = Buffer.alloc(8 + 256 * 4);
    idxHeader.writeUInt32BE(0xff744f63, 0); // \377tOc magic
    idxHeader.writeUInt32BE(2, 4); // Version 2
    for (let i = 0; i < 256; i++) {
      idxHeader.writeUInt32BE(fanout[i], 8 + i * 4);
    }

    const sha1Table = Buffer.concat(sorted.map((s) => s.sha1Buf));
    const crcTable = Buffer.alloc(sorted.length * 4);
    const offsetTable = Buffer.alloc(sorted.length * 4);

    for (let i = 0; i < sorted.length; i++) {
      crcTable.writeUInt32BE(sorted[i].crc32, i * 4);
      offsetTable.writeUInt32BE(sorted[i].packOffset, i * 4);
    }

    const idxBody = Buffer.concat([idxHeader, sha1Table, crcTable, offsetTable, packChecksum]);
    const idxChecksum = createHash('sha1').update(idxBody).digest();
    const idxBuffer = Buffer.concat([idxBody, idxChecksum]);

    return {
      packBuffer,
      idxBuffer,
      manifest: sorted.map((s) => ({
        sha1Hex: s.sha1Hex,
        type: s.type,
        size: s.size,
        packOffset: s.packOffset,
        crc32: s.crc32,
      })),
    };
  }

  /**
   * Initializes from disk paths or directly from memory-mapped buffers.
   */
  public initialize(inMemoryBuffers?: { packBuffer: Buffer; idxBuffer: Buffer }): void {
    if (inMemoryBuffers) {
      this.packBuffer = inMemoryBuffers.packBuffer;
      this.idxBuffer = inMemoryBuffers.idxBuffer;
    } else if (this.packPath) {
      const idxPath = this.packPath.replace(/\.pack$/, '.idx');
      if (!fs.existsSync(this.packPath) || !fs.existsSync(idxPath)) {
        throw new Error(`Pack or Index file not found for path: ${this.packPath}`);
      }
      this.packBuffer = fs.readFileSync(this.packPath);
      this.idxBuffer = fs.readFileSync(idxPath);
    } else {
      throw new Error('Must provide either packPath or inMemoryBuffers to SovereignPackStore.initialize()');
    }

    this.parseIndexHeader();
  }

  private parseIndexHeader(): void {
    const magic = this.idxBuffer.readUInt32BE(0);
    if (magic !== 0xff744f63) {
      throw new Error('Unsupported or invalid Git pack index version (Expected v2 \\377tOc format).');
    }

    const version = this.idxBuffer.readUInt32BE(4);
    if (version !== 2) {
      throw new Error(`Unsupported pack index version: ${version}. Version 2 required.`);
    }

    let offset = 8;
    for (let i = 0; i < 256; i++) {
      this.fanoutTable[i] = this.idxBuffer.readUInt32BE(offset);
      offset += 4;
    }

    this.numObjects = this.fanoutTable[255];
    this.sha1TableOffset = offset;
    const sha1TableSize = this.numObjects * 20;

    this.crcTableOffset = this.sha1TableOffset + sha1TableSize;
    const crcTableSize = this.numObjects * 4;

    this.offsetTableOffset = this.crcTableOffset + crcTableSize;
  }

  /**
   * Performs O(log N) binary search over the sorted SHA-1 table bounded by the 256-entry fan-out table.
   */
  public findObjectIndex(sha1Hex: string): { index: number; comparisons: number; fanoutRange: [number, number] } {
    const targetBuffer = Buffer.from(sha1Hex, 'hex');
    if (targetBuffer.length !== 20) {
      throw new Error('Invalid SHA-1 object hash length.');
    }

    const firstByte = targetBuffer[0];
    let low = firstByte === 0 ? 0 : this.fanoutTable[firstByte - 1];
    let high = this.fanoutTable[firstByte] - 1;
    const initialRange: [number, number] = [low, Math.max(low, high)];
    let comparisons = 0;

    while (low <= high) {
      comparisons++;
      const mid = Math.floor((low + high) / 2);
      const entryOffset = this.sha1TableOffset + mid * 20;
      const currentSha1 = this.idxBuffer.subarray(entryOffset, entryOffset + 20);

      const cmp = currentSha1.compare(targetBuffer);
      if (cmp === 0) {
        return { index: mid, comparisons, fanoutRange: initialRange };
      } else if (cmp < 0) {
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    return { index: -1, comparisons, fanoutRange: initialRange };
  }

  private getObjectOffset(index: number): number {
    const offsetEntryPos = this.offsetTableOffset + index * 4;
    const val = this.idxBuffer.readUInt32BE(offsetEntryPos);

    if (val & 0x80000000) {
      const largeOffsetIndex = val & 0x7fffffff;
      const largeOffsetBase = this.offsetTableOffset + this.numObjects * 4;
      const largeOffsetPos = largeOffsetBase + largeOffsetIndex * 8;
      return Number(this.idxBuffer.readBigUInt64BE(largeOffsetPos));
    }

    return val;
  }

  private getObjectCRC32(index: number): number {
    return this.idxBuffer.readUInt32BE(this.crcTableOffset + index * 4);
  }

  /**
   * Retrieves and inflates an object from the memory-mapped packfile by its SHA-1 hash with zero-copy slicing.
   */
  public getObject(sha1Hex: string): PackObject & { comparisons: number; fanoutRange: [number, number] } {
    const { index: objIndex, comparisons, fanoutRange } = this.findObjectIndex(sha1Hex);
    if (objIndex === -1) {
      throw new Error(`Object not found in pack index: ${sha1Hex}`);
    }

    const packOffset = this.getObjectOffset(objIndex);
    const crc32 = this.getObjectCRC32(objIndex);
    const parsed = this.parsePackObjectAtOffset(sha1Hex, packOffset, crc32);

    return {
      ...parsed,
      comparisons,
      fanoutRange,
    };
  }

  private parsePackObjectAtOffset(sha1Hex: string, offset: number, crc32: number): PackObject {
    let pos = offset;
    let b = this.packBuffer[pos++];
    const typeInt = (b >> 4) & 7;
    let size = b & 15;
    let shift = 4;

    while (b & 0x80) {
      b = this.packBuffer[pos++];
      size += (b & 0x7f) << shift;
      shift += 7;
    }

    const typeMap: Record<number, PackObject['type']> = {
      1: 'commit',
      2: 'tree',
      3: 'blob',
      4: 'tag',
      6: 'ofs_delta',
      7: 'ref_delta',
    };

    const type = typeMap[typeInt];
    if (!type) {
      throw new Error(`Unknown pack object type integer: ${typeInt}`);
    }

    if (type === 'ref_delta') {
      pos += 20;
    } else if (type === 'ofs_delta') {
      let c = this.packBuffer[pos++];
      while (c & 0x80) {
        c = this.packBuffer[pos++];
      }
    }

    const compressedData = this.packBuffer.subarray(pos);
    const uncompressedData = zlib.inflateSync(compressedData);

    return {
      sha1Hex,
      type,
      size,
      packOffset: offset,
      compressedBytes: compressedData.length,
      crc32,
      data: uncompressedData,
    };
  }

  public getFanoutSummary(): Array<{ bucketHex: string; cumulativeObjects: number }> {
    const summary: Array<{ bucketHex: string; cumulativeObjects: number }> = [];
    for (let i = 0; i < 256; i += 16) {
      summary.push({
        bucketHex: `0x${i.toString(16).padStart(2, '0').toUpperCase()}..0x${(i + 15).toString(16).padStart(2, '0').toUpperCase()}`,
        cumulativeObjects: this.fanoutTable[i + 15],
      });
    }
    return summary;
  }

  public getStats() {
    return {
      numObjects: this.numObjects,
      packByteSize: this.packBuffer?.length ?? 0,
      idxByteSize: this.idxBuffer?.length ?? 0,
      idxMagicHex: '0xFF744F63 (\\377tOc v2)',
      fanoutSummary: this.getFanoutSummary(),
    };
  }
}
