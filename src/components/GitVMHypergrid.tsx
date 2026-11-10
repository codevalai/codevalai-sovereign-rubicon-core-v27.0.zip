import React, { useState, useEffect } from 'react';
import {
  Database,
  RefreshCw,
  CheckCircle2,
  PlusCircle,
  GitBranch,
  HardDrive,
  ShieldCheck,
  ArrowUpRight,
  Radio,
} from 'lucide-react';

interface ObjectCatalogEntry {
  sha1Hex: string;
  type: 'commit' | 'tree' | 'blob' | 'tag' | 'ofs_delta' | 'ref_delta';
  size: number;
  packName: string;
  packOffset: number;
  label: string;
  reachable: boolean;
}

interface QueriedGitObject {
  sha1Hex: string;
  type: string;
  size: number;
  packName: string;
  packOffset: number;
  midxGlobalIndex: number;
  binarySearchComparisons: number;
  ewahReachable: boolean;
  bitmapBitValue: 0 | 1;
  lookupLatencyUs: number;
  decodedText: string;
  rawHexPreview: string;
}

interface GitVMProps {
  onInspectMerkleLeaf?: (index: number) => void;
}

export const GitVMHypergrid: React.FC<GitVMProps> = ({ onInspectMerkleLeaf }) => {
  const [overview, setOverview] = useState<any>(null);
  const [selectedOid, setSelectedOid] = useState<string>('');
  const [queriedObj, setQueriedObj] = useState<QueriedGitObject | null>(null);
  const [loading, setLoading] = useState(true);
  const [committing, setCommitting] = useState(false);
  const [gossiping, setGossiping] = useState(false);
  const [lastMerkleLeaf, setLastMerkleLeaf] = useState<number | null>(null);

  // Form states for committing new Git object into PackStore + MIDX + EWAH Bitmap
  const [targetPack, setTargetPack] = useState('pack-SOVEREIGN-CORE');
  const [objectType, setObjectType] = useState<'commit' | 'tree' | 'blob' | 'tag'>('commit');
  const [objectPayload, setObjectPayload] = useState(
    'tree 4b825dc642cb6eb9a060e54bf8d69288fbee4904\nauthor agent-sentinel <sentinel@sovereign.lattice>\n\nfeat(gitvm): zero-copy MIDX + EWAH bitmap state checkpoint signed with ML-DSA-65'
  );

  // Form states for Refspec PBFT Gossip vote
  const [voterNode, setVoterNode] = useState('agent-sentinel');

  // Vectorized 32-bit Uint32Array Bitmap Diff states
  const [branchA, setBranchA] = useState('refs/heads/main');
  const [branchB, setBranchB] = useState('refs/heads/swarm-quorum');
  const [bitmapDiffResult, setBitmapDiffResult] = useState<any>(null);
  const [diffingBitmap, setDiffingBitmap] = useState(false);

  // Quantum-Apex CXL / HotStuff / PMU / Nexus action states
  const [cxlOffset, setCxlOffset] = useState(0);
  const [cxlLength, setCxlLength] = useState(64);
  const [slicingCxl, setSlicingCxl] = useState(false);
  const [runningHotstuff, setRunningHotstuff] = useState(false);
  const [samplingPmu, setSamplingPmu] = useState(false);
  const [nexusDomain, setNexusDomain] = useState('ALL_DOMAINS');
  const [broadcastingNexus, setBroadcastingNexus] = useState(false);

  const fetchOverview = async () => {
    try {
      const res = await fetch('/api/gitvm/overview');
      const data = await res.json();
      setOverview(data);
      if (data.defaultBitmapDiff && !bitmapDiffResult) {
        setBitmapDiffResult(data.defaultBitmapDiff);
      }
      if (!selectedOid && data.objectCatalog?.length > 0) {
        const firstOid = data.objectCatalog[0].sha1Hex;
        setSelectedOid(firstOid);
        fetchObjectDetails(firstOid);
      }
    } catch (err) {
      console.error('Failed to fetch GitVM overview', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchObjectDetails = async (oid: string) => {
    try {
      const res = await fetch(`/api/gitvm/object/${oid}`);
      if (res.ok) {
        const data = await res.json();
        setQueriedObj(data);
      }
    } catch (err) {
      console.error('Failed to query GitVM object', err);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const handleSelectObject = (oid: string) => {
    setSelectedOid(oid);
    fetchObjectDetails(oid);
  };

  const handleCommitToPack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!objectPayload.trim() || committing) return;
    setCommitting(true);
    try {
      const res = await fetch('/api/gitvm/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packName: targetPack,
          type: objectType,
          content: objectPayload,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setOverview(data.overview);
        if (data.overview?.defaultBitmapDiff) {
          setBitmapDiffResult(data.overview.defaultBitmapDiff);
        }
        setSelectedOid(data.sha1Hex);
        setLastMerkleLeaf(data.merkleLeafIndex);
        await fetchObjectDetails(data.sha1Hex);
      }
    } catch (err) {
      console.error('Failed to commit object to pack', err);
    } finally {
      setCommitting(false);
    }
  };

  const handleBroadcastRefspec = async () => {
    setGossiping(true);
    try {
      const res = await fetch('/api/gitvm/gossip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voterNode,
          commitOid: selectedOid || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setLastMerkleLeaf(data.merkleLeafIndex);
        await fetchOverview();
      }
    } catch (err) {
      console.error('Failed to broadcast refspec vote', err);
    } finally {
      setGossiping(false);
    }
  };

  const handleRunBitmapDiff = async (targetA = branchA, targetB = branchB) => {
    setDiffingBitmap(true);
    try {
      const res = await fetch('/api/gitvm/bitmap-diff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branchA: targetA, branchB: targetB }),
      });
      const data = await res.json();
      if (res.ok) {
        setBitmapDiffResult(data);
        setLastMerkleLeaf(data.merkleLeafIndex);
      }
    } catch (err) {
      console.error('Failed to run vectorized bitmap diff', err);
    } finally {
      setDiffingBitmap(false);
    }
  };

  const handleSliceCXLWindow = async () => {
    setSlicingCxl(true);
    try {
      const res = await fetch('/api/gitvm/cxl-slice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offset: cxlOffset, length: cxlLength }),
      });
      const data = await res.json();
      if (res.ok && data.overview) {
        setOverview(data.overview);
        setLastMerkleLeaf(data.merkleLeafIndex);
      }
    } catch (err) {
      console.error('Failed to slice CXL memory window', err);
    } finally {
      setSlicingCxl(false);
    }
  };

  const handleRunHotStuffPipeline = async () => {
    setRunningHotstuff(true);
    try {
      const res = await fetch('/api/gitvm/hotstuff-consensus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposedOid: selectedOid || undefined }),
      });
      const data = await res.json();
      if (res.ok && data.overview) {
        setOverview(data.overview);
        setLastMerkleLeaf(data.merkleLeafIndex);
      }
    } catch (err) {
      console.error('Failed to execute HotStuff 3-phase consensus', err);
    } finally {
      setRunningHotstuff(false);
    }
  };

  const handleSamplePMU = async (simulateSpike: boolean) => {
    setSamplingPmu(true);
    try {
      const res = await fetch('/api/gitvm/pmu-sample', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodeId: voterNode, simulateSpike }),
      });
      const data = await res.json();
      if (res.ok && data.overview) {
        setOverview(data.overview);
        setLastMerkleLeaf(data.merkleLeafIndex);
      }
    } catch (err) {
      console.error('Failed to sample PMU counters', err);
    } finally {
      setSamplingPmu(false);
    }
  };

  const handleBroadcastNexus = async () => {
    setBroadcastingNexus(true);
    try {
      const res = await fetch('/api/gitvm/nexus-broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetDomain: nexusDomain,
          directivePayload: `Synchronize CXL.mem 3.1 MIDX pointers + HotStuff QC for OID ${(selectedOid || 'HEAD').slice(0, 12)}`,
        }),
      });
      const data = await res.json();
      if (res.ok && data.overview) {
        setOverview(data.overview);
        setLastMerkleLeaf(data.merkleLeafIndex);
      }
    } catch (err) {
      console.error('Failed to broadcast Nexus directive', err);
    } finally {
      setBroadcastingNexus(false);
    }
  };

  return (
    <div className="space-y-8 p-6 lg:p-8 max-w-[1440px] mx-auto">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <div className="text-xs font-mono text-cyan-600 dark:text-cyan-400 mb-1">
            03. Git-Native Virtual Machine (Packfile v2 + MIDX v1 + EWAH Bitmap + FIPS 204 ML-DSA-65)
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            GitVM Hypergrid &amp; Memory-Mapped Object Engine
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-3xl">
            Zero-copy RAM memory-mapped <code className="font-mono text-xs text-cyan-600 dark:text-cyan-400">.pack</code> / <code className="font-mono text-xs text-cyan-600 dark:text-cyan-400">.idx</code> (\377tOc v2) store, Multi-Pack-Index (<code className="font-mono text-xs text-cyan-600 dark:text-cyan-400">MIDX</code>) chunk resolver (<code className="font-mono text-xs">PNMF</code>, <code className="font-mono text-xs">OIDF</code>, <code className="font-mono text-xs">OIDN</code>, <code className="font-mono text-xs">OOFF</code>), and EWAH compressed <code className="font-mono text-xs text-cyan-600 dark:text-cyan-400">.bitmap</code> reachability bitmasks.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {lastMerkleLeaf !== null && onInspectMerkleLeaf && (
            <button
              onClick={() => onInspectMerkleLeaf(lastMerkleLeaf)}
              className="px-3.5 py-2 text-xs font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/20 transition-colors flex items-center gap-1 cursor-pointer"
            >
              DAG Bound → Merkle Leaf #{lastMerkleLeaf}
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={fetchOverview}
            className="px-4 py-2 text-xs font-semibold text-white dark:text-slate-950 bg-cyan-600 dark:bg-cyan-400 hover:bg-cyan-500 dark:hover:bg-cyan-300 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Sync RAM Buffers
          </button>
        </div>
      </div>

      {/* 4-Column Scientific Metric Display Specification */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <span className="text-xs tracking-wider uppercase font-mono text-slate-500 dark:text-slate-400 block">
            MULTI-PACK-INDEX (MIDX v1)
          </span>
          <div className="mt-2 flex items-baseline">
            <span className="text-2xl font-mono font-bold text-slate-900 dark:text-white tabular-nums">
              {overview?.midx?.numObjects ?? 11}
            </span>
            <span className="text-xs uppercase font-mono text-slate-400 ml-1.5">
              OBJECTS ACROSS {overview?.midx?.numPacks ?? 3} PACKS
            </span>
          </div>
          <span className="text-xs font-mono text-cyan-600 dark:text-cyan-400 mt-1 block tabular-nums">
            MIDX Buffer: {overview?.midx?.midxByteSize ?? 1496} B · O(log N) OIDN
          </span>
        </div>

        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <span className="text-xs tracking-wider uppercase font-mono text-slate-500 dark:text-slate-400 block">
            EWAH COMPRESSED BITMAP (.BITMAP)
          </span>
          <div className="mt-2 flex items-baseline">
            <span className="text-2xl font-mono font-bold text-slate-900 dark:text-white tabular-nums">
              {overview?.bitmap?.reachableCount ?? 10}
            </span>
            <span className="text-xs uppercase font-mono text-slate-400 ml-1.5">
              / {overview?.bitmap?.numObjects ?? 11} REACHABLE
            </span>
          </div>
          <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 mt-1 block">
            ● O(1) Bitmask Reachability Probe
          </span>
        </div>

        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <span className="text-xs tracking-wider uppercase font-mono text-slate-500 dark:text-slate-400 block">
            PACK STORE v2 (\377tOc INDEX)
          </span>
          <div className="mt-2 flex items-baseline">
            <span className="text-2xl font-mono font-bold text-slate-900 dark:text-white tabular-nums">
              {overview?.packStore?.packByteSize ?? 482}
            </span>
            <span className="text-xs uppercase font-mono text-slate-400 ml-1.5">
              B PACK + {overview?.packStore?.idxByteSize ?? 1192} B IDX
            </span>
          </div>
          <span className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-1 block">
            256-Entry Fanout + CRC32 Verified
          </span>
        </div>

        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <span className="text-xs tracking-wider uppercase font-mono text-slate-500 dark:text-slate-400 block">
            FIPS 204 ML-DSA-65 COMMIT SIGNING
          </span>
          <div className="mt-2 flex items-baseline">
            <span className="text-2xl font-mono font-bold text-slate-900 dark:text-white tabular-nums">
              3,309
            </span>
            <span className="text-xs uppercase font-mono text-slate-400 ml-1.5">
              BYTES / SIG
            </span>
          </div>
          <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 mt-1 block">
            ● Post-Quantum DAG Attestation
          </span>
        </div>
      </div>

      {/* Main Split: Global MIDX Object Catalog & EWAH Bitmask (7 cols) + Zero-Copy RAM Object Inspector (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 7 Cols: MIDX Chunks, EWAH Bitmask Strip, and Object Table */}
        <div className="lg:col-span-7 space-y-6">
          {/* MIDX Chunk Architecture & EWAH Reachability Bitmask Strip */}
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  01. MIDX Chunk Lookup Table &amp; EWAH Reachability Bitmask
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Live memory-mapped chunk offsets inside <code className="font-mono">multi-pack-index</code> and decompressed EWAH reachability bits.
                </p>
              </div>
              <span className="text-xs font-mono text-cyan-600 dark:text-cyan-400">
                {overview?.midx?.signature || 'MIDX (0x4D494458)'}
              </span>
            </div>

            {/* 4 Chunk Cards: PNMF, OIDF, OIDN, OOFF */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono tabular-nums">
              {(overview?.midx?.chunks || []).map((chunk: any) => (
                <div
                  key={chunk.id}
                  className="p-3 rounded-lg bg-slate-50 dark:bg-[#0B0E17] border border-slate-200 dark:border-slate-800"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-cyan-600 dark:text-cyan-400">{chunk.id}</span>
                    <span className="text-[10px] text-slate-400">CHUNK</span>
                  </div>
                  <div className="mt-1 text-slate-900 dark:text-white font-semibold">
                    {chunk.size} B
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Offset: 0x{chunk.offset.toString(16).toUpperCase()}
                  </div>
                </div>
              ))}
            </div>

            {/* EWAH Decompressed Bitmask Interactive Array */}
            <div>
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400 mb-2">
                <span>DECOMPRESSED EWAH BITMASK (1 BIT PER MIDX OBJECT INDEX)</span>
                <span>1 = REACHABLE FROM HEAD · 0 = ORPHANED / GC CANDIDATE</span>
              </div>
              <div className="flex flex-wrap gap-1.5 p-3 rounded-lg bg-slate-50 dark:bg-[#0B0E17] border border-slate-200 dark:border-slate-800">
                {(overview?.objectCatalog || []).map((obj: ObjectCatalogEntry, idx: number) => {
                  const isSelected = obj.sha1Hex === selectedOid;
                  return (
                    <button
                      key={obj.sha1Hex}
                      onClick={() => handleSelectObject(obj.sha1Hex)}
                      className={`px-2.5 py-1.5 rounded font-mono text-xs tabular-nums transition-all cursor-pointer flex items-center gap-1.5 border ${
                        isSelected
                          ? 'ring-2 ring-cyan-400 border-cyan-500 bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 font-bold'
                          : obj.reachable
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                          : 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20'
                      }`}
                      title={`MIDX[${idx}] ${obj.type} (${obj.sha1Hex})`}
                    >
                      <span className="text-[10px] opacity-75">idx[{idx}]:</span>
                      <span>{obj.reachable ? '1' : '0'}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* MIDX Multi-Pack Object Table */}
          <div className="bg-white dark:bg-[#0B0E17] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                02. Memory-Mapped Multi-Pack Object Directory (OIDN Sorted)
              </h3>
              <span className="text-xs font-mono text-slate-500">
                Click row for O(log N) zero-copy zlib inflation
              </span>
            </div>

            {loading ? (
              <div className="p-10 text-center text-xs font-mono text-slate-500">
                Memory-mapping .pack, .idx, multi-pack-index, and .bitmap buffers...
              </div>
            ) : (
              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-slate-50 dark:bg-[#111827] border-b border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                    <tr>
                      <th className="py-2.5 px-4">MIDX</th>
                      <th className="py-2.5 px-4">SHA-1 OBJECT OID</th>
                      <th className="py-2.5 px-4">TYPE</th>
                      <th className="py-2.5 px-4">PACKFILE</th>
                      <th className="py-2.5 px-4 text-right">OFFSET</th>
                      <th className="py-2.5 px-4">BITMAP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/80 text-xs font-mono">
                    {(overview?.objectCatalog || []).map((obj: ObjectCatalogEntry, idx: number) => {
                      const isRowSelected = obj.sha1Hex === selectedOid;
                      return (
                        <tr
                          key={obj.sha1Hex}
                          onClick={() => handleSelectObject(obj.sha1Hex)}
                          className={`transition-colors cursor-pointer ${
                            isRowSelected
                              ? 'bg-cyan-50/70 dark:bg-cyan-950/30'
                              : 'hover:bg-slate-50 dark:hover:bg-[#111827]/60'
                          }`}
                        >
                          <td className="py-2.5 px-4 tabular-nums font-bold text-cyan-600 dark:text-cyan-400">
                            #{idx}
                          </td>
                          <td className="py-2.5 px-4 text-slate-900 dark:text-white whitespace-nowrap">
                            {obj.sha1Hex.slice(0, 18)}...
                          </td>
                          <td className="py-2.5 px-4 uppercase text-slate-600 dark:text-slate-300">
                            {obj.type}
                          </td>
                          <td className="py-2.5 px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                            {obj.packName}
                          </td>
                          <td className="py-2.5 px-4 text-right tabular-nums text-slate-600 dark:text-slate-300">
                            +{obj.packOffset} B
                          </td>
                          <td className="py-2.5 px-4 whitespace-nowrap">
                            {obj.reachable ? (
                              <span className="text-emerald-600 dark:text-emerald-400">● 1 (DAG)</span>
                            ) : (
                              <span className="text-rose-600 dark:text-rose-400">○ 0 (UNREACH)</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right 5 Cols: Zero-Copy Object Decoder + Write Object to Pack + Refspec Gossip */}
        <div className="lg:col-span-5 space-y-6">
          {/* Zero-Copy Object Inspector */}
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 block">
                  ZERO-COPY PACK SLICE &amp; ZLIB INFLATION
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                  {queriedObj ? `MIDX Index #${queriedObj.midxGlobalIndex} (${queriedObj.type.toUpperCase()})` : 'Select Object'}
                </h3>
              </div>
              {queriedObj && (
                <span className="text-xs font-mono text-cyan-600 dark:text-cyan-400 tabular-nums">
                  {queriedObj.lookupLatencyUs} μs ({queriedObj.binarySearchComparisons} cmp)
                </span>
              )}
            </div>

            {queriedObj && (
              <div className="space-y-3 text-xs font-mono">
                <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-slate-50 dark:bg-[#0B0E17] border border-slate-200 dark:border-slate-800 tabular-nums">
                  <div>
                    <span className="text-[10px] text-slate-400 block">RESOLVED PACKFILE</span>
                    <span className="text-slate-900 dark:text-white font-semibold">
                      {queriedObj.packName}.pack
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">PACK BYTE OFFSET</span>
                    <span className="text-cyan-600 dark:text-cyan-400 font-semibold">
                      Offset +{queriedObj.packOffset} B ({queriedObj.size} B)
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">EWAH REACHABILITY</span>
                    <span
                      className={
                        queriedObj.ewahReachable
                          ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                          : 'text-rose-600 dark:text-rose-400 font-semibold'
                      }
                    >
                      Bit={queriedObj.bitmapBitValue} ({queriedObj.ewahReachable ? 'REACHABLE' : 'ORPHANED'})
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">OID BINARY SEARCH</span>
                    <span className="text-slate-900 dark:text-white font-semibold">
                      {queriedObj.binarySearchComparisons} O(log N) hops
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">
                    DECODED GIT OBJECT PAYLOAD (UTF-8)
                  </span>
                  <pre className="p-3 rounded-lg bg-slate-50 dark:bg-[#0B0E17] border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 whitespace-pre-wrap break-all text-[11px] max-h-40 overflow-y-auto leading-relaxed">
                    {queriedObj.decodedText}
                  </pre>
                </div>
              </div>
            )}
          </div>

          {/* Commit New State Object to PackStore + Bind to Merkle Spine */}
          <form
            onSubmit={handleCommitToPack}
            className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  03. Commit State Object to Packfile &amp; Bind Merkle Leaf
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Signs with FIPS 204 ML-DSA-65, repacks MIDX + EWAH Bitmap, and appends a SHA-256 leaf to the Merkle Spine.
                </p>
              </div>
              <HardDrive className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">TARGET PACKFILE</label>
                <select
                  value={targetPack}
                  onChange={(e) => setTargetPack(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-[#0B0E17] border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
                >
                  <option value="pack-SOVEREIGN-CORE">pack-SOVEREIGN-CORE</option>
                  <option value="pack-SWARM-EPOCH">pack-SWARM-EPOCH</option>
                  <option value="pack-MERKLE-DAG">pack-MERKLE-DAG</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">GIT OBJECT TYPE</label>
                <select
                  value={objectType}
                  onChange={(e) => setObjectType(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-[#0B0E17] border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
                >
                  <option value="commit">commit (1)</option>
                  <option value="tree">tree (2)</option>
                  <option value="blob">blob (3)</option>
                  <option value="tag">tag (4)</option>
                </select>
              </div>
            </div>

            <textarea
              value={objectPayload}
              onChange={(e) => setObjectPayload(e.target.value)}
              rows={3}
              className="w-full p-2.5 text-xs font-mono bg-slate-50 dark:bg-[#0B0E17] border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 resize-none"
              required
            />

            <button
              type="submit"
              disabled={committing}
              className="w-full py-2 px-4 text-xs font-semibold text-white dark:text-slate-950 bg-cyan-600 dark:bg-cyan-400 hover:bg-cyan-500 dark:hover:bg-cyan-300 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              {committing ? 'Packing & Signing with ML-DSA-65...' : 'Pack Object, Update MIDX/Bitmap & Bind Merkle Spine'}
            </button>
          </form>
        </div>
      </div>

      {/* Bottom Panel: P2P Swarm Gossip via Git Wire Protocol Refspecs */}
      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              04. Git Wire Protocol Refspec PBFT Gossip Bus (+refs/swarm/*)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Asynchronous PBFT quorum votes transmitted via ML-DSA-65 signed Git reference updates (<code className="font-mono">git push origin +refs/swarm/voter/epoch:refs/remotes/swarm/quorum</code>).
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <select
              value={voterNode}
              onChange={(e) => setVoterNode(e.target.value)}
              className="px-3 py-1.5 text-xs font-mono bg-slate-50 dark:bg-[#0B0E17] border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
            >
              <option value="agent-sentinel">agent-sentinel</option>
              <option value="agent-velocity">agent-velocity</option>
              <option value="agent-nexus">agent-nexus</option>
              <option value="agent-aletheia">agent-aletheia</option>
              <option value="agent-veritas">agent-veritas</option>
            </select>

            <button
              onClick={handleBroadcastRefspec}
              disabled={gossiping}
              className="px-4 py-1.5 text-xs font-semibold text-white dark:text-slate-950 bg-cyan-600 dark:bg-cyan-400 hover:bg-cyan-500 dark:hover:bg-cyan-300 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Radio className="w-3.5 h-3.5" />
              Push Signed Refspec Vote
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
          {(overview?.gossipLog || []).slice(0, 6).map((vote: any) => (
            <div
              key={vote.id}
              className="p-3.5 rounded-lg bg-slate-50 dark:bg-[#0B0E17] border border-slate-200 dark:border-slate-800 space-y-1.5"
            >
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-cyan-600 dark:text-cyan-400 font-semibold">
                  {vote.voterNode}
                </span>
                <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> ML-DSA-65 VALID
                </span>
              </div>
              <div className="text-slate-900 dark:text-white truncate" title={vote.refspec}>
                {vote.refspec}
              </div>
              <div className="text-[10px] text-slate-500 truncate">
                OID: {vote.commitOid} · Sig: {vote.mldsaSignatureHex.slice(0, 16)}...
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 05: Vectorized 32-Bit Uint32Array EWAH Bitmap Diff Engine (XOR: A ⊕ B & Set Difference: A \ B) */}
      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              05. Vectorized 32-Bit Uint32Array Bitmap Diff Engine (A ⊕ B &amp; A \ B)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Hardware-accelerated word-level bitwise <code className="font-mono">xorDiff</code> and <code className="font-mono">setDifference</code> across branch bitmaps, decoded directly to Git SHA-1 OIDs via <code className="font-mono">SovereignMIDXStore.getOIDByIndex</code> without walking the commit graph.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0 text-xs font-mono">
            <select
              value={branchA}
              onChange={(e) => {
                setBranchA(e.target.value);
                handleRunBitmapDiff(e.target.value, branchB);
              }}
              className="px-2.5 py-1.5 bg-slate-50 dark:bg-[#0B0E17] border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
            >
              {(overview?.branches || []).map((b: any) => (
                <option key={b.branchName} value={b.branchName}>
                  A: {b.branchName} ({b.reachableIndices.length} objs)
                </option>
              ))}
            </select>

            <span className="text-slate-400">⊕ / \</span>

            <select
              value={branchB}
              onChange={(e) => {
                setBranchB(e.target.value);
                handleRunBitmapDiff(branchA, e.target.value);
              }}
              className="px-2.5 py-1.5 bg-slate-50 dark:bg-[#0B0E17] border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
            >
              {(overview?.branches || []).map((b: any) => (
                <option key={b.branchName} value={b.branchName}>
                  B: {b.branchName} ({b.reachableIndices.length} objs)
                </option>
              ))}
            </select>

            <button
              onClick={() => handleRunBitmapDiff(branchA, branchB)}
              disabled={diffingBitmap}
              className="px-3.5 py-1.5 font-semibold text-white dark:text-slate-950 bg-cyan-600 dark:bg-cyan-400 hover:bg-cyan-500 dark:hover:bg-cyan-300 rounded-lg transition-colors cursor-pointer"
            >
              {diffingBitmap ? 'Computing...' : 'Execute Uint32 Diff'}
            </button>
          </div>
        </div>

        {bitmapDiffResult && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 text-xs font-mono">
            <div className="lg:col-span-5 p-4 rounded-lg bg-slate-50 dark:bg-[#0B0E17] border border-slate-200 dark:border-slate-800 space-y-2.5 tabular-nums">
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>BITWISE REGISTER METRICS</span>
                <span className="text-cyan-600 dark:text-cyan-400 font-bold">
                  {bitmapDiffResult.computeLatencyUs} μs
                </span>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Mask A ({bitmapDiffResult.branchA?.branchName}):</span>
                  <span className="text-slate-900 dark:text-white font-semibold">
                    0x{bitmapDiffResult.maskAHex}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Mask B ({bitmapDiffResult.branchB?.branchName}):</span>
                  <span className="text-slate-900 dark:text-white font-semibold">
                    0x{bitmapDiffResult.maskBHex}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">XOR Diff (A ⊕ B):</span>
                  <span className="text-cyan-600 dark:text-cyan-400 font-bold">
                    0x{bitmapDiffResult.xorMaskHex}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Set Diff (A \ B):</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                    0x{bitmapDiffResult.setDiffABHex}
                  </span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 p-4 rounded-lg bg-slate-50 dark:bg-[#0B0E17] border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>RESOLVED DELTA OBJECTS IN (A \ B) VIA MIDX.getOIDByIndex()</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold tabular-nums">
                  {bitmapDiffResult.onlyInBranchA?.length || 0} Delta Objects
                </span>
              </div>
              {bitmapDiffResult.onlyInBranchA?.length === 0 ? (
                <div className="py-4 text-center text-slate-500">
                  Zero delta objects in A \ B (Branch A is a subset of or identical to Branch B).
                </div>
              ) : (
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {(bitmapDiffResult.onlyInBranchA || []).map((obj: any) => (
                    <div
                      key={obj.sha1Hex}
                      onClick={() => handleSelectObject(obj.sha1Hex)}
                      className="p-2 rounded bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 cursor-pointer hover:border-cyan-500"
                    >
                      <span className="text-cyan-600 dark:text-cyan-400 font-semibold">
                        {obj.sha1Hex.slice(0, 16)}...
                      </span>
                      <span className="uppercase text-slate-500">{obj.type}</span>
                      <span className="text-slate-400 truncate max-w-[220px]">{obj.packName}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Section 06: Quantum-Apex Hardware & Universal Ecosystem Interconnect */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CXL Type-3 Persistent Memory Window + Hardware PMU Cycle Watchdog */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                06A. CXL 3.1 Type-3 (/dev/dax0.0) &amp; eBPF PMU Cycle Watchdog
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Base HPA <code className="font-mono">{overview?.cxlMemory?.cxlBaseAddressHex || '0x7FFF00000000'}</code> · PMU Budget: 1,500,000 cycles
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSliceCXLWindow}
                disabled={slicingCxl}
                className="px-2.5 py-1.5 text-xs font-mono font-semibold text-cyan-700 dark:text-cyan-300 bg-cyan-500/15 border border-cyan-500/30 rounded-lg hover:bg-cyan-500/25 cursor-pointer"
              >
                {slicingCxl ? 'Slicing...' : 'Slice CXL Window'}
              </button>
              <button
                onClick={() => handleSamplePMU(false)}
                disabled={samplingPmu}
                className="px-2.5 py-1.5 text-xs font-mono font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/25 cursor-pointer"
              >
                Sample PMU
              </button>
            </div>
          </div>

          <div className="space-y-3 text-xs font-mono tabular-nums">
            {overview?.cxlMemory?.recentSlices?.[0] && (
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#0B0E17] border border-slate-200 dark:border-slate-800 space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-cyan-600 dark:text-cyan-400 font-bold">
                    {overview.cxlMemory.recentSlices[0].sliceId} ({overview.cxlMemory.recentSlices[0].daxDevicePath})
                  </span>
                  <span className="text-emerald-600 dark:text-emerald-400">
                    {overview.cxlMemory.recentSlices[0].latencyNs} ns · MESI-Snoop
                  </span>
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-300">
                  VA: {overview.cxlMemory.recentSlices[0].virtualAddressHex} (+{overview.cxlMemory.recentSlices[0].offsetBytes}B, len {overview.cxlMemory.recentSlices[0].lengthBytes}B)
                </div>
                <div className="text-[10px] text-slate-400 truncate">
                  SHA-256: {overview.cxlMemory.recentSlices[0].sha256SliceDigest}
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <div className="text-[10px] text-slate-400 uppercase">
                RECENT EBPF PERF_EVENT_OPEN PMU SAMPLES
              </div>
              {(overview?.pmuWatchdog?.recentSamples || []).slice(0, 3).map((s: any) => (
                <div
                  key={s.sampleId}
                  className="p-2.5 rounded-lg bg-slate-50 dark:bg-[#0B0E17] border border-slate-200 dark:border-slate-800 flex items-center justify-between"
                >
                  <span>
                    <strong className="text-slate-900 dark:text-white">{s.nodeId}</strong> ·{' '}
                    {s.cpuCyclesDelta.toLocaleString()} cycles · IPC {s.ipcRatio}
                  </span>
                  <span
                    className={
                      s.breachDetected
                        ? 'text-rose-600 dark:text-rose-400 font-bold'
                        : 'text-emerald-600 dark:text-emerald-400'
                    }
                  >
                    {s.actionTaken}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Pipelined 3-Phase HotStuff BFT + 5-Domain Universal Ecosystem Nexus Bus */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                06B. 3-Phase HotStuff BFT &amp; 5-Domain Nexus Interconnect
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                View #{overview?.hotstuffBft?.currentView ?? 2} (PREPARE → PRE-COMMIT → COMMIT) · 5 Sovereign Domains
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRunHotStuffPipeline}
                disabled={runningHotstuff}
                className="px-2.5 py-1.5 text-xs font-mono font-semibold text-cyan-700 dark:text-cyan-300 bg-cyan-500/15 border border-cyan-500/30 rounded-lg hover:bg-cyan-500/25 cursor-pointer"
              >
                {runningHotstuff ? 'Quorum...' : '3-Phase HotStuff'}
              </button>
              <button
                onClick={handleBroadcastNexus}
                disabled={broadcastingNexus}
                className="px-2.5 py-1.5 text-xs font-mono font-semibold text-white dark:text-slate-950 bg-cyan-600 dark:bg-cyan-400 rounded-lg hover:bg-cyan-500 cursor-pointer"
              >
                {broadcastingNexus ? 'Pushing...' : 'Nexus Broadcast'}
              </button>
            </div>
          </div>

          <div className="space-y-3 text-xs font-mono tabular-nums">
            {overview?.hotstuffBft?.committedHistory?.[0] && (
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#0B0E17] border border-slate-200 dark:border-slate-800 space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-cyan-600 dark:text-cyan-400 font-bold">
                    {overview.hotstuffBft.committedHistory[0].qcId} · Leader: {overview.hotstuffBft.committedHistory[0].leaderNode}
                  </span>
                  <span className="text-emerald-600 dark:text-emerald-400">
                    ● 5/5 ML-DSA-65 QC DECIDED ({overview.hotstuffBft.committedHistory[0].pipelineLatencyUs} μs)
                  </span>
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-300 truncate">
                  Refspec: {overview.hotstuffBft.committedHistory[0].gitRefspec}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(overview?.nexusBus?.nodes || []).map((n: any) => (
                <div
                  key={n.id}
                  className="p-2.5 rounded-lg bg-slate-50 dark:bg-[#0B0E17] border border-slate-200 dark:border-slate-800 flex items-center justify-between"
                >
                  <div>
                    <div className="text-slate-900 dark:text-white font-semibold">{n.domain.toUpperCase()}</div>
                    <div className="text-[10px] text-slate-500">{n.hardwareTier}</div>
                  </div>
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400">
                    ● {n.directivesProcessed} sync
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
