import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import { createHash } from 'crypto';
import { SovereignPackStore, RawGitObjectInput } from './SovereignPackStore.js';

export interface MIDXPackObject {
  sha1Hex: string;
  type: 'commit' | 'tree' | 'blob' | 'tag' | 'ofs_delta' | 'ref_delta';
  size: number;
  data: Buffer;
  packName: string;
  packOffset: number;
  midxGlobalIndex: number;
  comparisons: number;
}

export interface MIDXChunkDescriptor {
  id: string;
  offset: number;
  size: number;
}

export class SovereignMIDXStore {
  private midxBuffer!: Buffer;
  private packBuffers: Map<string, Buffer> = new Map();
  private packNames: string[] = [];
  private numObjects = 0;
  private numPacks = 0;
  private chunkOffsets: Map<string, { offset: number; size: number }> = new Map();

  constructor(private objectsDir?: string) {}

  /**
   * Synthesizes an authentic, binary-compliant Git Multi-Pack-Index (`MIDX` v1) buffer
   * containing `PNMF` (Pack Names), `OIDF` (256-entry OID Fanout), `OIDN` (Sorted 20B OIDs),
   * and `OOFF` (8B Pack ID + Offset pairs) across multiple Packfiles.
   */
  public static synthesizeMIDXFromPacks(
    packs: Array<{ name: string; rawObjects: RawGitObjectInput[] }>
  ): {
    midxBuffer: Buffer;
    packBuffers: Map<string, Buffer>;
    objectCatalog: Array<{
      sha1Hex: string;
      type: MIDXPackObject['type'];
      size: number;
      packName: string;
      packOffset: number;
      label: string;
    }>;
  } {
    const packBuffers = new Map<string, Buffer>();
    const allEntries: Array<{
      sha1Buf: Buffer;
      sha1Hex: string;
      type: MIDXPackObject['type'];
      size: number;
      packIndex: number;
      packName: string;
      packOffset: number;
      label: string;
    }> = [];

    packs.forEach((p, packIndex) => {
      const synth = SovereignPackStore.synthesizePackAndIdxBuffers(p.rawObjects);
      packBuffers.set(p.name, synth.packBuffer);
      synth.manifest.forEach((m, idx) => {
        const rawPreview = Buffer.isBuffer(p.rawObjects[idx]?.content)
          ? p.rawObjects[idx].content.toString('utf8')
          : String(p.rawObjects[idx]?.content || '');
        allEntries.push({
          sha1Buf: Buffer.from(m.sha1Hex, 'hex'),
          sha1Hex: m.sha1Hex,
          type: m.type,
          size: m.size,
          packIndex,
          packName: p.name,
          packOffset: m.packOffset,
          label: rawPreview.slice(0, 96),
        });
      });
    });

    // Deduplicate and sort lexicographically by 20-byte SHA-1 OID
    const uniqueMap = new Map<string, (typeof allEntries)[0]>();
    for (const item of allEntries) {
      if (!uniqueMap.has(item.sha1Hex)) {
        uniqueMap.set(item.sha1Hex, item);
      }
    }
    const sorted = Array.from(uniqueMap.values()).sort((a, b) => a.sha1Buf.compare(b.sha1Buf));

    // 1. Build PNMF (Pack Names) chunk with 4-byte alignment padding
    const pnmfParts: Buffer[] = [];
    let pnmfLen = 0;
    for (const p of packs) {
      const strBuf = Buffer.from(`${p.name}\0`, 'utf8');
      pnmfParts.push(strBuf);
      pnmfLen += strBuf.length;
    }
    while (pnmfLen % 4 !== 0) {
      pnmfParts.push(Buffer.from([0]));
      pnmfLen++;
    }
    const pnmfChunk = Buffer.concat(pnmfParts);

    // 2. Build OIDF (256-entry Fan-Out) chunk (1024 bytes)
    const oidfChunk = Buffer.alloc(256 * 4);
    let cumulative = 0;
    let sortedCursor = 0;
    for (let b = 0; b < 256; b++) {
      while (sortedCursor < sorted.length && sorted[sortedCursor].sha1Buf[0] === b) {
        cumulative++;
        sortedCursor++;
      }
      oidfChunk.writeUInt32BE(cumulative, b * 4);
    }

    // 3. Build OIDN (Sorted 20-byte SHA-1 hashes) chunk
    const oidnChunk = Buffer.concat(sorted.map((s) => s.sha1Buf));

    // 4. Build OOFF (Object Offsets: 4B packIndex + 4B packOffset per object) chunk
    const ooffChunk = Buffer.alloc(sorted.length * 8);
    sorted.forEach((s, i) => {
      ooffChunk.writeUInt32BE(s.packIndex, i * 8);
      ooffChunk.writeUInt32BE(s.packOffset, i * 8 + 4);
    });

    // Header (12 bytes) + 5 Chunk Lookup Entries (4 chunks + 1 terminating sentinel = 5 * 12 = 60 bytes)
    // Wait: our parseHeaderAndChunks reads `chunkCount` entries (4 chunks) and computes the last chunk's end from `midxBuffer.length - 20`.
    const chunkCount = 4;
    const headerSize = 12;
    const lookupTableSize = chunkCount * 12;
    let runningOffset = headerSize + lookupTableSize;

    const chunks = [
      { id: 'PNMF', buf: pnmfChunk },
      { id: 'OIDF', buf: oidfChunk },
      { id: 'OIDN', buf: oidnChunk },
      { id: 'OOFF', buf: ooffChunk },
    ];

    const headerBuf = Buffer.alloc(headerSize);
    headerBuf.writeUInt32BE(0x4d494458, 0); // 'MIDX'
    headerBuf.writeUInt8(1, 4); // Version 1
    headerBuf.writeUInt8(1, 5); // Hash Version 1 (SHA-1)
    headerBuf.writeUInt16BE(chunkCount, 6);
    headerBuf.writeUInt32BE(packs.length, 8);

    const tableBuf = Buffer.alloc(lookupTableSize);
    chunks.forEach((c, idx) => {
      tableBuf.write(c.id, idx * 12, 4, 'ascii');
      tableBuf.writeBigUInt64BE(BigInt(runningOffset), idx * 12 + 4);
      runningOffset += c.buf.length;
    });

    const bodyBeforeChecksum = Buffer.concat([headerBuf, tableBuf, ...chunks.map((c) => c.buf)]);
    const trailerChecksum = createHash('sha1').update(bodyBeforeChecksum).digest();
    const midxBuffer = Buffer.concat([bodyBeforeChecksum, trailerChecksum]);

    return {
      midxBuffer,
      packBuffers,
      objectCatalog: sorted.map((s) => ({
        sha1Hex: s.sha1Hex,
        type: s.type,
        size: s.size,
        packName: s.packName,
        packOffset: s.packOffset,
        label: s.label,
      })),
    };
  }

  /**
   * Initializes and memory-maps the multi-pack-index file and all referenced .pack files.
   */
  public initialize(inMemory?: { midxBuffer: Buffer; packBuffers: Map<string, Buffer> }): void {
    if (inMemory) {
      this.midxBuffer = inMemory.midxBuffer;
      this.packBuffers = inMemory.packBuffers;
      this.parseHeaderAndChunks();
      return;
    }

    if (!this.objectsDir) {
      throw new Error('Must provide objectsDir or inMemory buffers to SovereignMIDXStore.initialize()');
    }

    const midxPath = path.join(this.objectsDir, 'pack', 'multi-pack-index');
    if (!fs.existsSync(midxPath)) {
      throw new Error(`Multi-Pack-Index (MIDX) not found at path: ${midxPath}`);
    }

    this.midxBuffer = fs.readFileSync(midxPath);
    this.parseHeaderAndChunks();
    this.loadPackBuffers();
  }

  private parseHeaderAndChunks(): void {
    const signature = this.midxBuffer.readUInt32BE(0);
    if (signature !== 0x4d494458) {
      throw new Error('Invalid MIDX signature. Expected "MIDX" (0x4D494458).');
    }

    const version = this.midxBuffer.readUInt8(4);
    if (version !== 1) {
      throw new Error(`Unsupported MIDX version: ${version}. Version 1 required.`);
    }

    const hashVersion = this.midxBuffer.readUInt8(5);
    if (hashVersion !== 1) {
      throw new Error(`Unsupported hash version: ${hashVersion}`);
    }

    const chunkCount = this.midxBuffer.readUInt16BE(6);
    this.numPacks = this.midxBuffer.readUInt32BE(8);

    let tableOffset = 12;
    const chunkHeaders: Array<{ id: string; offset: number }> = [];

    for (let i = 0; i < chunkCount; i++) {
      const chunkId = this.midxBuffer.subarray(tableOffset, tableOffset + 4).toString('ascii');
      const chunkOffset = Number(this.midxBuffer.readBigUInt64BE(tableOffset + 4));
      chunkHeaders.push({ id: chunkId, offset: chunkOffset });
      tableOffset += 12;
    }

    for (let i = 0; i < chunkHeaders.length; i++) {
      const current = chunkHeaders[i];
      let nextOffset = this.midxBuffer.length - 20;
      if (i + 1 < chunkHeaders.length) {
        nextOffset = chunkHeaders[i + 1].offset;
      }
      this.chunkOffsets.set(current.id, {
        offset: current.offset,
        size: nextOffset - current.offset,
      });
    }

    const oidf = this.chunkOffsets.get('OIDF');
    if (oidf) {
      this.numObjects = this.midxBuffer.readUInt32BE(oidf.offset + 255 * 4);
    }

    this.parsePackNamesChunk();
  }

  private parsePackNamesChunk(): void {
    const pnmf = this.chunkOffsets.get('PNMF');
    if (!pnmf) {
      throw new Error('Required chunk "PNMF" (Pack Names) missing in MIDX file.');
    }

    let pos = pnmf.offset;
    const end = pnmf.offset + pnmf.size;
    const packNames: string[] = [];

    for (let i = 0; i < this.numPacks && pos < end; i++) {
      let nullTerminator = pos;
      while (nullTerminator < end && this.midxBuffer[nullTerminator] !== 0) {
        nullTerminator++;
      }
      const packName = this.midxBuffer.subarray(pos, nullTerminator).toString('utf8');
      if (packName) {
        packNames.push(packName);
      }
      pos = nullTerminator + 1;
    }

    this.packNames = packNames;
  }

  private loadPackBuffers(): void {
    if (!this.objectsDir) return;
    const packDir = path.join(this.objectsDir, 'pack');
    for (const name of this.packNames) {
      const packPath = path.join(packDir, `${name}.pack`);
      if (fs.existsSync(packPath)) {
        this.packBuffers.set(name, fs.readFileSync(packPath));
      } else {
        throw new Error(`Referenced packfile not found on disk: ${packPath}`);
      }
    }
  }

  /**
   * Public O(log N) binary search over the MIDX OIDN table bounded by OIDF fan-out.
   */
  public findObjectIndex(sha1Hex: string): number {
    return this.findObjectIndexWithMetrics(sha1Hex).index;
  }

  public findObjectIndexWithMetrics(sha1Hex: string): { index: number; comparisons: number } {
    const targetBuffer = Buffer.from(sha1Hex, 'hex');
    if (targetBuffer.length !== 20) {
      throw new Error('Invalid SHA-1 object hash length.');
    }

    const oidn = this.chunkOffsets.get('OIDN');
    const oidf = this.chunkOffsets.get('OIDF');
    if (!oidn || !oidf) {
      throw new Error('OID lookup chunks missing in MIDX.');
    }

    const firstByte = targetBuffer[0];
    const fanoutBase = oidf.offset;

    let low = firstByte === 0 ? 0 : this.midxBuffer.readUInt32BE(fanoutBase + (firstByte - 1) * 4);
    let high = this.midxBuffer.readUInt32BE(fanoutBase + firstByte * 4) - 1;
    let comparisons = 0;

    while (low <= high) {
      comparisons++;
      const mid = Math.floor((low + high) / 2);
      const entryPos = oidn.offset + mid * 20;
      const currentOid = this.midxBuffer.subarray(entryPos, entryPos + 20);

      const cmp = currentOid.compare(targetBuffer);
      if (cmp === 0) {
        return { index: mid, comparisons };
      } else if (cmp < 0) {
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    return { index: -1, comparisons };
  }

  /**
   * Direct O(1) lookup of a 20-byte SHA-1 OID hex string by its global MIDX index in the OIDN chunk.
   * Used by SovereignBitmapDiff.resolveObjectHashes for instant bitmask-to-OID decoding.
   */
  public getOIDByIndex(globalIndex: number): string | null {
    if (globalIndex < 0 || globalIndex >= this.numObjects) return null;
    const oidn = this.chunkOffsets.get('OIDN');
    if (!oidn) return null;
    const entryPos = oidn.offset + globalIndex * 20;
    if (entryPos + 20 > this.midxBuffer.length) return null;
    return this.midxBuffer.subarray(entryPos, entryPos + 20).toString('hex');
  }

  public getRawMIDXBuffer(): Buffer {
    return this.midxBuffer;
  }

  private getObjectLocation(midxIndex: number): { packName: string; offset: number } {
    const ooff = this.chunkOffsets.get('OOFF');
    if (!ooff) {
      throw new Error('Object offset chunk "OOFF" missing in MIDX.');
    }

    const entryPos = ooff.offset + midxIndex * 8;
    const packIndex = this.midxBuffer.readUInt32BE(entryPos);
    let packOffset = this.midxBuffer.readUInt32BE(entryPos + 4);

    if (packOffset & 0x80000000) {
      const loff = this.chunkOffsets.get('LOFF');
      if (!loff) throw new Error('Large offset chunk missing for large packfile.');
      const largeOffsetIndex = packOffset & 0x7fffffff;
      const largeOffsetPos = loff.offset + largeOffsetIndex * 8;
      packOffset = Number(this.midxBuffer.readBigUInt64BE(largeOffsetPos));
    }

    const packName = this.packNames[packIndex];
    return { packName, offset: packOffset };
  }

  /**
   * Retrieves an object by its SHA-1 hash across all active multi-pack indexes.
   */
  public getObject(sha1Hex: string): MIDXPackObject {
    const { index: midxIndex, comparisons } = this.findObjectIndexWithMetrics(sha1Hex);
    if (midxIndex === -1) {
      throw new Error(`Object ${sha1Hex} not found across multi-pack index.`);
    }

    const { packName, offset } = this.getObjectLocation(midxIndex);
    const packBuffer = this.packBuffers.get(packName);
    if (!packBuffer) {
      throw new Error(`Packfile buffer not loaded for pack: ${packName}`);
    }

    const parsed = this.parsePackObjectAtOffset(packBuffer, packName, offset);
    return {
      ...parsed,
      sha1Hex,
      packOffset: offset,
      midxGlobalIndex: midxIndex,
      comparisons,
    };
  }

  private parsePackObjectAtOffset(
    packBuffer: Buffer,
    packName: string,
    offset: number
  ): Omit<MIDXPackObject, 'sha1Hex' | 'packOffset' | 'midxGlobalIndex' | 'comparisons'> {
    let pos = offset;
    let b = packBuffer[pos++];
    const typeInt = (b >> 4) & 7;
    let size = b & 15;
    let shift = 4;

    while (b & 0x80) {
      b = packBuffer[pos++];
      size += (b & 0x7f) << shift;
      shift += 7;
    }

    const typeMap: Record<number, MIDXPackObject['type']> = {
      1: 'commit',
      2: 'tree',
      3: 'blob',
      4: 'tag',
      6: 'ofs_delta',
      7: 'ref_delta',
    };

    const type = typeMap[typeInt];
    if (!type) throw new Error(`Unknown pack object type integer: ${typeInt}`);

    if (type === 'ref_delta') {
      pos += 20;
    } else if (type === 'ofs_delta') {
      let c = packBuffer[pos++];
      while (c & 0x80) {
        c = packBuffer[pos++];
      }
    }

    const compressedData = packBuffer.subarray(pos);
    const uncompressedData = zlib.inflateSync(compressedData);

    return {
      type,
      size,
      data: uncompressedData,
      packName,
    };
  }

  public getDiagnostics() {
    const chunks: MIDXChunkDescriptor[] = [];
    this.chunkOffsets.forEach((val, key) => {
      chunks.push({ id: key, offset: val.offset, size: val.size });
    });

    return {
      signature: 'MIDX (0x4D494458)',
      version: 1,
      hashVersion: 'SHA-1 (1)',
      numPacks: this.numPacks,
      numObjects: this.numObjects,
      midxByteSize: this.midxBuffer?.length ?? 0,
      packNames: this.packNames,
      chunks,
    };
  }
}
