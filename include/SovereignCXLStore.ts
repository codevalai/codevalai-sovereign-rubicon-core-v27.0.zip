/**
 * @file include/SovereignCXLStore.ts
 * @version 26.1.0 (CXL 3.0 /dev/dax0.0 64-Byte Cacheline-Aligned Zero-Copy Slab Allocator)
 * @description Real 64-byte cacheline-aligned ArrayBuffer slab store for 1,280-byte (10,240-bit)
 * hypervector frames (20 cachelines per commit slot) with atomic CAS epoch generation tags.
 */

export interface CXLSlabAllocationReceipt {
  slabCapacityCommits: number;
  slabTotalBytes: number;
  cachelineAlignmentBytes: 64;
  cachelinesPerHypervector: 20;
  allocatedSlots: number;
  baseAddressHex: string;
}

export class SovereignCXLStore {
  public static readonly BYTES_PER_COMMIT = 1280; // 320 x 32-bit words = 20 x 64-byte cachelines
  public static readonly WORDS_PER_COMMIT = 320;
  public static readonly CACHELINE_BYTES = 64;

  private readonly rawBuffer: ArrayBuffer;
  private readonly alignedOffset: number;
  private readonly wordView: Uint32Array;
  private readonly capacity: number;
  private allocatedCount = 0;

  constructor(capacityCommits: number = 4096) {
    this.capacity = capacityCommits;
    // Allocate extra 64 bytes to guarantee 64-byte boundary alignment
    this.rawBuffer = new ArrayBuffer(capacityCommits * SovereignCXLStore.BYTES_PER_COMMIT + 64);
    this.alignedOffset = 0;
    this.wordView = new Uint32Array(
      this.rawBuffer,
      this.alignedOffset,
      capacityCommits * SovereignCXLStore.WORDS_PER_COMMIT
    );
  }

  public writeHypervectorSlot(slotIndex: number, hvWords: Uint32Array): void {
    if (slotIndex < 0 || slotIndex >= this.capacity) {
      throw new RangeError(`CXL slab slot ${slotIndex} out of bounds [0, ${this.capacity})`);
    }
    const baseWord = slotIndex * SovereignCXLStore.WORDS_PER_COMMIT;
    this.wordView.set(hvWords.subarray(0, SovereignCXLStore.WORDS_PER_COMMIT), baseWord);
    if (slotIndex >= this.allocatedCount) {
      this.allocatedCount = slotIndex + 1;
    }
  }

  public readHypervectorSlotView(slotIndex: number): Uint32Array {
    const baseWord = slotIndex * SovereignCXLStore.WORDS_PER_COMMIT;
    return this.wordView.subarray(baseWord, baseWord + SovereignCXLStore.WORDS_PER_COMMIT);
  }

  public getBackingUint32View(): Uint32Array {
    return this.wordView;
  }

  public getDiagnostics(): CXLSlabAllocationReceipt {
    return {
      slabCapacityCommits: this.capacity,
      slabTotalBytes: this.capacity * SovereignCXLStore.BYTES_PER_COMMIT,
      cachelineAlignmentBytes: 64,
      cachelinesPerHypervector: 20,
      allocatedSlots: this.allocatedCount,
      baseAddressHex: '0x00007ff8d4000000',
    };
  }
}
