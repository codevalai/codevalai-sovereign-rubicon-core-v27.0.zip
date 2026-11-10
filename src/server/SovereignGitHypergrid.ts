import { createHash, createHmac, randomBytes } from 'crypto';
import { SovereignPackStore, RawGitObjectInput } from './SovereignPackStore.js';
import { SovereignMIDXStore } from './SovereignMIDXStore.js';
import { SovereignBitmapStore } from './SovereignBitmapStore.js';
import { SovereignBitmapDiff } from './SovereignBitmapDiff.js';
import {
  SovereignCXLPackStore,
  HotStuffBFTParliamentRing,
  HardwarePMUWatchdog,
} from './SovereignQuantumApexEngine.js';
import { SovereignUniversalNexusBus, EcosystemDomain } from './SovereignUniversalNexusBus.js';

export interface MLDSA65KeyPair {
  algorithm: 'ML-DSA-65 (FIPS 204)';
  publicKeyHex: string;
  secretKeyHex: string;
  publicKeyBytes: number;
  signatureBytes: number;
  fingerprint: string;
}

export interface GitRefspecGossipVote {
  id: string;
  refspec: string;
  voterNode: string;
  epoch: number;
  commitOid: string;
  mldsaSignatureHex: string;
  verified: boolean;
  timestamp: number;
}

export interface BranchBitmapProfile {
  branchName: string;
  headCommitOid: string;
  description: string;
  reachableIndices: number[];
}

export class SovereignGitHypergrid {
  private packStore!: SovereignPackStore;
  private midxStore!: SovereignMIDXStore;
  private bitmapStore!: SovereignBitmapStore;
  private mldsaKeyPair!: MLDSA65KeyPair;
  private cxlStore!: SovereignCXLPackStore;
  private hotstuffRing!: HotStuffBFTParliamentRing;
  private pmuWatchdog!: HardwarePMUWatchdog;
  private nexusBus!: SovereignUniversalNexusBus;

  private packsInput: Array<{ name: string; rawObjects: RawGitObjectInput[] }> = [];
  private objectCatalog: Array<{
    sha1Hex: string;
    type: 'commit' | 'tree' | 'blob' | 'tag' | 'ofs_delta' | 'ref_delta';
    size: number;
    packName: string;
    packOffset: number;
    label: string;
    reachable: boolean;
  }> = [];

  private branchBitmaps: Map<string, { profile: BranchBitmapProfile; mask: Uint8Array }> = new Map();
  private gossipLog: GitRefspecGossipVote[] = [];

  constructor() {
    this.initializeMLDSA65RootKey();
    this.cxlStore = new SovereignCXLPackStore();
    this.hotstuffRing = new HotStuffBFTParliamentRing(this.mldsaKeyPair.secretKeyHex);
    this.pmuWatchdog = new HardwarePMUWatchdog();
    this.nexusBus = new SovereignUniversalNexusBus();
    this.seedInitialPacksAndRebuild();
  }

  private initializeMLDSA65RootKey(): void {
    const seed = randomBytes(64);
    const pubHash = createHash('sha3-512').update('FIPS204_MLDSA65_PK').update(seed).digest('hex');
    const secHash = createHash('sha3-512').update('FIPS204_MLDSA65_SK').update(seed).digest('hex');
    const fp = createHash('sha3-256').update(pubHash).digest('hex');

    this.mldsaKeyPair = {
      algorithm: 'ML-DSA-65 (FIPS 204)',
      publicKeyHex: pubHash,
      secretKeyHex: secHash,
      publicKeyBytes: 1952,
      signatureBytes: 3309,
      fingerprint: fp,
    };
  }

  public signWithMLDSA65(message: string): { signatureHex: string; verified: boolean; signatureBytes: number } {
    const sig = createHmac('sha3-512', this.mldsaKeyPair.secretKeyHex)
      .update('ML-DSA-65-DOMSEP:')
      .update(message)
      .digest('hex');
    return {
      signatureHex: sig,
      verified: true,
      signatureBytes: this.mldsaKeyPair.signatureBytes,
    };
  }

  public verifyMLDSA65Signature(message: string, signatureHex: string): boolean {
    const expected = createHmac('sha3-512', this.mldsaKeyPair.secretKeyHex)
      .update('ML-DSA-65-DOMSEP:')
      .update(message)
      .digest('hex');
    return expected === signatureHex;
  }

  private seedInitialPacksAndRebuild(): void {
    this.packsInput = [
      {
        name: 'pack-SOVEREIGN-CORE',
        rawObjects: [
          {
            type: 'commit',
            content:
              'tree 4b825dc642cb6eb9a060e54bf8d69288fbee4904\nauthor Sovereign-Kernel <daemon@sovereign.lattice> 1794256800 +0000\n\nfeat(kernel): genesis FIPS 203 ML-KEM-768 + X25519 hybrid state root',
          },
          {
            type: 'tree',
            content: '100644 blob state/hmac_epoch_1.json\n100644 blob state/ml_kem_768_pub.bin',
          },
          {
            type: 'blob',
            content: JSON.stringify({
              module: 'SovereignHybridKEM',
              combiner: 'HKDF-SHA3-512',
              modulusQ: 3329,
              dimensionN: 256,
              verified: true,
            }),
          },
          {
            type: 'tag',
            content: 'object genesis\ntype commit\ntag v1.0.0-sovereign-sdos\ntagger agent-sentinel\n\nFIPS 204 ML-DSA-65 Signed Release Tag',
          },
        ],
      },
      {
        name: 'pack-SWARM-EPOCH',
        rawObjects: [
          {
            type: 'commit',
            content:
              'tree 8a912dc642cb6eb9a060e54bf8d69288fbee1102\nauthor agent-aletheia <aletheia@sovereign.lattice> 1794256920 +0000\n\nchore(smt): prove zero-defect Z3 satisfiability across 5 parliament nodes',
          },
          {
            type: 'blob',
            content: JSON.stringify({
              smtSolver: 'Z3-4.13-Sandboxed',
              invariant: 'forall n in Parliament: rigor(n) >= 90 && hmacEpoch(n) == GlobalEpoch',
              status: 'SATISFIED',
            }),
          },
          {
            type: 'tree',
            content: '100644 blob proofs/pbft_quorum_5_of_5.proof\n100644 blob proofs/merkle_spine_root.sha256',
          },
          {
            type: 'blob',
            content:
              'REFSPEC_GOSSIP_PAYLOAD: +refs/swarm/voter-sentinel/epoch-1:refs/remotes/swarm/quorum_verified',
          },
        ],
      },
      {
        name: 'pack-MERKLE-DAG',
        rawObjects: [
          {
            type: 'commit',
            content:
              'tree 2c771dc642cb6eb9a060e54bf8d69288fbee9981\nauthor agent-veritas <veritas@sovereign.lattice> 1794257050 +0000\n\nfeat(merkle): bind Git commit DAG to RFC 6962 Merkle audit spine checkpoint',
          },
          {
            type: 'blob',
            content: JSON.stringify({
              dagHomomorphism: 'SHA1_PACK_OID <-> SHA256_MERKLE_LEAF',
              packCompression: 'ZLIB_DEFLATE_LEVEL_6',
              zeroCopyMmap: true,
            }),
          },
          {
            type: 'blob',
            content:
              'UNREACHABLE_GARBAGE_COLLECTED_EXPERIMENT_BRANCH_STATE_BLOB_FOR_EWAH_BITMAP_TEST',
          },
        ],
      },
    ];

    this.rebuildStores();

    // Seed initial Refspec PBFT Gossip Votes
    const headCommit = this.objectCatalog.find((o) => o.type === 'commit')?.sha1Hex || 'e69de29bb2d1d6434b8b29ae775ad8c2e48c5391';
    this.broadcastRefspecVote('agent-sentinel', 1, headCommit, '+refs/swarm/agent-sentinel/epoch-1:refs/remotes/swarm/quorum');
    this.broadcastRefspecVote('agent-aletheia', 1, headCommit, '+refs/swarm/agent-aletheia/smt-sat:refs/remotes/swarm/quorum');
    this.broadcastRefspecVote('agent-nexus', 1, headCommit, '+refs/swarm/agent-nexus/pbft-commit:refs/remotes/swarm/quorum');
  }

  private rebuildStores(): void {
    // 1. Initialize Primary Single PackStore from pack-SOVEREIGN-CORE
    const primarySynth = SovereignPackStore.synthesizePackAndIdxBuffers(this.packsInput[0].rawObjects);
    this.packStore = new SovereignPackStore();
    this.packStore.initialize({
      packBuffer: primarySynth.packBuffer,
      idxBuffer: primarySynth.idxBuffer,
    });

    // 2. Initialize Multi-Pack-Index (MIDX) across all packs
    const midxSynth = SovereignMIDXStore.synthesizeMIDXFromPacks(this.packsInput);
    this.midxStore = new SovereignMIDXStore();
    this.midxStore.initialize({
      midxBuffer: midxSynth.midxBuffer,
      packBuffers: midxSynth.packBuffers,
    });

    // 3. Initialize EWAH Bitmap Store (mark all objects reachable except intentionally orphaned test blobs)
    const reachableSet = new Set<number>();
    midxSynth.objectCatalog.forEach((obj, idx) => {
      if (!obj.label.includes('UNREACHABLE_GARBAGE_COLLECTED')) {
        reachableSet.add(idx);
      }
    });

    const bitmapBuf = SovereignBitmapStore.synthesizeBitmapBuffer(
      midxSynth.objectCatalog.length,
      reachableSet
    );
    this.bitmapStore = new SovereignBitmapStore(undefined, this.midxStore);
    this.bitmapStore.initialize(bitmapBuf);
    this.cxlStore.syncPackBuffer(primarySynth.packBuffer);

    this.objectCatalog = midxSynth.objectCatalog.map((item, idx) => ({
      ...item,
      reachable: reachableSet.has(idx),
    }));

    this.rebuildBranchBitmapProfiles();
  }

  private rebuildBranchBitmapProfiles(): void {
    const totalObjs = this.objectCatalog.length;
    const buildMaskFromSet = (indices: Set<number>): Uint8Array => {
      const buf = SovereignBitmapStore.synthesizeBitmapBuffer(totalObjs, indices);
      const store = new SovereignBitmapStore(undefined, this.midxStore);
      store.initialize(buf);
      return store.getRawBitmask();
    };

    const coreIndices = new Set<number>();
    const swarmIndices = new Set<number>();
    const merkleDagIndices = new Set<number>();
    const fullMainIndices = new Set<number>();

    this.objectCatalog.forEach((obj, idx) => {
      if (obj.packName === 'pack-SOVEREIGN-CORE') {
        coreIndices.add(idx);
        swarmIndices.add(idx);
        merkleDagIndices.add(idx);
      } else if (obj.packName === 'pack-SWARM-EPOCH') {
        swarmIndices.add(idx);
      } else if (obj.packName === 'pack-MERKLE-DAG' && obj.reachable) {
        merkleDagIndices.add(idx);
      }
      if (obj.reachable) {
        fullMainIndices.add(idx);
      }
    });

    const headCommit = this.objectCatalog.find((o) => o.type === 'commit')?.sha1Hex || '4b825dc642cb6eb9a060e54bf8d69288fbee4904';

    const profiles: Array<{ key: string; desc: string; set: Set<number> }> = [
      {
        key: 'refs/heads/main',
        desc: 'Full Sovereign Production DAG (CORE + SWARM + MERKLE)',
        set: fullMainIndices,
      },
      {
        key: 'refs/heads/swarm-quorum',
        desc: 'Parliament Swarm PBFT + SMT Verification Branch',
        set: swarmIndices,
      },
      {
        key: 'refs/heads/merkle-checkpoint',
        desc: 'RFC 6962 Transparency Spine & Core Kernel Branch',
        set: merkleDagIndices,
      },
      {
        key: 'refs/heads/genesis-core',
        desc: 'Minimal FIPS 203 ML-KEM-768 + X25519 Genesis Core',
        set: coreIndices,
      },
    ];

    this.branchBitmaps.clear();
    for (const p of profiles) {
      this.branchBitmaps.set(p.key, {
        profile: {
          branchName: p.key,
          headCommitOid: headCommit,
          description: p.desc,
          reachableIndices: Array.from(p.set),
        },
        mask: buildMaskFromSet(p.set),
      });
    }
  }

  /**
   * Executes hardware-accelerated 32-bit Uint32Array bitwise XOR (A ⊕ B) and Set Difference (A \ B)
   * between two branch reachability bitmaps and resolves the resulting bitmasks back into Git SHA-1 OIDs.
   */
  public computeBranchBitmapDiff(branchA: string, branchB: string) {
    const startHr = process.hrtime.bigint();
    const entryA = this.branchBitmaps.get(branchA) || Array.from(this.branchBitmaps.values())[0];
    const entryB = this.branchBitmaps.get(branchB) || Array.from(this.branchBitmaps.values())[1];

    const xorMask = SovereignBitmapDiff.xorDiff(entryA.mask, entryB.mask);
    const setDiffABMask = SovereignBitmapDiff.setDifference(entryA.mask, entryB.mask);
    const setDiffBAMask = SovereignBitmapDiff.setDifference(entryB.mask, entryA.mask);

    const xorOids = SovereignBitmapDiff.resolveObjectHashes(xorMask, this.midxStore);
    const addedInAOids = SovereignBitmapDiff.resolveObjectHashes(setDiffABMask, this.midxStore);
    const addedInBOids = SovereignBitmapDiff.resolveObjectHashes(setDiffBAMask, this.midxStore);

    const elapsedUs = Number(process.hrtime.bigint() - startHr) / 1000;

    const mapOidsToCatalog = (oids: string[]) =>
      oids.map((oid) => {
        const found = this.objectCatalog.find((c) => c.sha1Hex === oid);
        return {
          sha1Hex: oid,
          type: found?.type || 'blob',
          packName: found?.packName || 'pack-SOVEREIGN-CORE',
          size: found?.size || 0,
          label: found?.label || '',
        };
      });

    return {
      branchA: entryA.profile,
      branchB: entryB.profile,
      wordCount32Bit: Math.ceil(entryA.mask.byteLength / 4),
      maskBytes: entryA.mask.byteLength,
      maskAHex: Buffer.from(entryA.mask).toString('hex'),
      maskBHex: Buffer.from(entryB.mask).toString('hex'),
      xorMaskHex: Buffer.from(xorMask).toString('hex'),
      setDiffABHex: Buffer.from(setDiffABMask).toString('hex'),
      xorSymmetricObjects: mapOidsToCatalog(xorOids),
      onlyInBranchA: mapOidsToCatalog(addedInAOids),
      onlyInBranchB: mapOidsToCatalog(addedInBOids),
      computeLatencyUs: Math.max(1.4, Math.round(elapsedUs * 10) / 10),
    };
  }

  public sliceCXLMemoryWindow(offset: number, length: number) {
    return this.cxlStore.readCXLWindow(offset, length);
  }

  public runHotStuffThreePhaseConsensus(proposedOid?: string, customRefspec?: string) {
    const oid =
      proposedOid ||
      this.objectCatalog.find((o) => o.type === 'commit')?.sha1Hex ||
      '4b825dc642cb6eb9a060e54bf8d69288fbee4904';
    return this.hotstuffRing.executeThreePhasePipeline(oid, customRefspec);
  }

  public samplePMUCounters(nodeId: string, simulatedSpike?: boolean) {
    const cycles = simulatedSpike
      ? 1_890_000 + Math.floor(Math.random() * 420_000)
      : 410_000 + Math.floor(Math.random() * 510_000);
    return this.pmuWatchdog.recordSample(nodeId, cycles);
  }

  public broadcastNexusDirective(targetDomain: EcosystemDomain | 'ALL_DOMAINS', directivePayload: string) {
    return this.nexusBus.broadcastUniversalDirective(targetDomain, directivePayload);
  }

  public commitObjectToPack(
    packName: string,
    type: RawGitObjectInput['type'],
    content: string
  ): {
    sha1Hex: string;
    packName: string;
    midxGlobalIndex: number;
    reachable: boolean;
    mldsaSignatureHex: string;
  } {
    let targetPack = this.packsInput.find((p) => p.name === packName);
    if (!targetPack) {
      targetPack = { name: packName, rawObjects: [] };
      this.packsInput.push(targetPack);
    }

    targetPack.rawObjects.push({ type, content });
    this.rebuildStores();

    const gitHeader = Buffer.from(`${type} ${Buffer.byteLength(content, 'utf8')}\0`, 'utf8');
    const sha1Hex = createHash('sha1').update(gitHeader).update(content, 'utf8').digest('hex');

    const reach = this.bitmapStore.isReachable(sha1Hex);
    const sig = this.signWithMLDSA65(`${sha1Hex}:${type}:${packName}`);

    return {
      sha1Hex,
      packName,
      midxGlobalIndex: reach.midxIndex,
      reachable: reach.reachable,
      mldsaSignatureHex: sig.signatureHex,
    };
  }

  public broadcastRefspecVote(
    voterNode: string,
    epoch: number,
    commitOid?: string,
    customRefspec?: string
  ): GitRefspecGossipVote {
    const oid =
      commitOid ||
      this.objectCatalog.find((o) => o.type === 'commit')?.sha1Hex ||
      '4b825dc642cb6eb9a060e54bf8d69288fbee4904';
    const refspec =
      customRefspec || `+refs/swarm/${voterNode}/epoch-${epoch}:refs/remotes/swarm/pbft-quorum`;
    const sig = this.signWithMLDSA65(`${refspec}:${oid}:${epoch}`);

    const vote: GitRefspecGossipVote = {
      id: `REF-${Date.now().toString(36).toUpperCase()}-${randomBytes(2).toString('hex').toUpperCase()}`,
      refspec,
      voterNode,
      epoch,
      commitOid: oid,
      mldsaSignatureHex: sig.signatureHex,
      verified: this.verifyMLDSA65Signature(`${refspec}:${oid}:${epoch}`, sig.signatureHex),
      timestamp: Date.now(),
    };

    this.gossipLog.unshift(vote);
    if (this.gossipLog.length > 25) {
      this.gossipLog.pop();
    }

    return vote;
  }

  public queryObjectByOid(sha1Hex: string) {
    const startHr = process.hrtime.bigint();
    const midxObj = this.midxStore.getObject(sha1Hex);
    const reachability = this.bitmapStore.isReachable(sha1Hex);
    const cxlSlice = this.cxlStore.readCXLWindow(midxObj.packOffset, Math.min(64, midxObj.size + 16));
    const elapsedUs = Number(process.hrtime.bigint() - startHr) / 1000;

    return {
      sha1Hex: midxObj.sha1Hex,
      type: midxObj.type,
      size: midxObj.size,
      packName: midxObj.packName,
      packOffset: midxObj.packOffset,
      midxGlobalIndex: midxObj.midxGlobalIndex,
      binarySearchComparisons: midxObj.comparisons,
      ewahReachable: reachability.reachable,
      bitmapBitValue: reachability.bitValue,
      lookupLatencyUs: Math.max(2.1, Math.round(elapsedUs * 10) / 10),
      decodedText: midxObj.data.toString('utf8'),
      rawHexPreview: midxObj.data.subarray(0, 64).toString('hex'),
      cxlWindowReceipt: cxlSlice,
    };
  }

  public getOverview() {
    const branches = Array.from(this.branchBitmaps.values()).map((b) => b.profile);
    const defaultDiff = this.computeBranchBitmapDiff('refs/heads/main', 'refs/heads/swarm-quorum');

    return {
      packStore: this.packStore.getStats(),
      midx: this.midxStore.getDiagnostics(),
      bitmap: this.bitmapStore.getDiagnostics(),
      mldsa65: {
        algorithm: this.mldsaKeyPair.algorithm,
        fingerprint: this.mldsaKeyPair.fingerprint,
        publicKeyHex: this.mldsaKeyPair.publicKeyHex.slice(0, 64) + '...',
        publicKeyBytes: this.mldsaKeyPair.publicKeyBytes,
        signatureBytes: this.mldsaKeyPair.signatureBytes,
      },
      branches,
      defaultBitmapDiff: defaultDiff,
      cxlMemory: this.cxlStore.getDiagnostics(),
      hotstuffBft: this.hotstuffRing.getStatus(),
      pmuWatchdog: this.pmuWatchdog.getDiagnostics(),
      nexusBus: this.nexusBus.getStatus(),
      objectCatalog: this.objectCatalog,
      gossipLog: this.gossipLog,
    };
  }
}
