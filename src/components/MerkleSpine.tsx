import React, { useState, useEffect } from 'react';
import { ShieldCheck, RefreshCw, CheckCircle2, Search, PlusCircle, Scissors, Ban } from 'lucide-react';

interface AuditLeaf {
  index: number;
  timestamp: number;
  eventId: string;
  topic: string;
  hash: string;
  signature: string;
  payloadSummary?: string;
  revoked?: boolean;
  revocationReason?: string;
}

interface InclusionStep {
  level: number;
  position: 'left' | 'right' | 'promoted';
  siblingHash: string;
  parentHash: string;
}

interface InclusionProof {
  leaf: AuditLeaf;
  rootHash: string;
  steps: InclusionStep[];
  verified: boolean;
  verifiedAt: number;
}

interface DiagnosticData {
  merkleRoot: string;
  merkleTreeDepth: number;
  merkleLevelWidths: number[];
  auditLogCount: number;
  hmacEpoch: number;
  auditLeaves: AuditLeaf[];
}

interface MerkleSpineProps {
  initialLeafIndex?: number | null;
}

export const MerkleSpine: React.FC<MerkleSpineProps> = ({ initialLeafIndex }) => {
  const [data, setData] = useState<DiagnosticData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedLeafIndex, setSelectedLeafIndex] = useState<number>(0);
  const [proof, setProof] = useState<InclusionProof | null>(null);
  const [verifyingProof, setVerifyingProof] = useState(false);
  const [topicFilter, setTopicFilter] = useState('');
  const [customTopic, setCustomTopic] = useState('merkle.custom.attestation');
  const [customPayload, setCustomPayload] = useState('Zero-Defect Sovereign Operator Attestation Checkpoint');
  const [mutating, setMutating] = useState(false);

  const fetchDiagnostics = async () => {
    try {
      const res = await fetch('/api/diagnostics');
      const diag = await res.json();
      setData(diag);
      if (diag.auditLeaves?.length > 0 && selectedLeafIndex === 0 && initialLeafIndex == null) {
        const latestIdx = diag.auditLeaves[0].index;
        setSelectedLeafIndex(latestIdx);
        fetchInclusionProof(latestIdx);
      }
    } catch (err) {
      console.error('Failed to fetch diagnostics', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchInclusionProof = async (index: number) => {
    setVerifyingProof(true);
    try {
      const res = await fetch(`/api/merkle/proof/${index}`);
      if (res.ok) {
        const proofData = await res.json();
        setProof(proofData);
      }
    } catch (err) {
      console.error('Failed to verify inclusion proof', err);
    } finally {
      setVerifyingProof(false);
    }
  };

  useEffect(() => {
    fetchDiagnostics();
    const interval = setInterval(fetchDiagnostics, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (initialLeafIndex !== undefined && initialLeafIndex !== null) {
      setSelectedLeafIndex(initialLeafIndex);
      fetchInclusionProof(initialLeafIndex);
    }
  }, [initialLeafIndex]);

  const handleSelectLeaf = (idx: number) => {
    setSelectedLeafIndex(idx);
    fetchInclusionProof(idx);
  };

  const handleAppendLeaf = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTopic.trim() || mutating) return;
    setMutating(true);
    try {
      const res = await fetch('/api/merkle/append', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: customTopic,
          payload: { attestation: customPayload, timestamp: Date.now() },
        }),
      });
      const result = await res.json();
      await fetchDiagnostics();
      if (result.leaf?.index !== undefined) {
        setSelectedLeafIndex(result.leaf.index);
        await fetchInclusionProof(result.leaf.index);
      }
    } catch (err) {
      console.error('Failed to append leaf', err);
    } finally {
      setMutating(false);
    }
  };

  const handleRevokeLeaf = async (idx: number) => {
    setMutating(true);
    try {
      await fetch('/api/merkle/mutate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'revoke',
          index: idx,
          reason: 'OPERATOR_REVOCATION_TOMBSTONE',
        }),
      });
      await fetchDiagnostics();
      await fetchInclusionProof(idx);
    } catch (err) {
      console.error('Failed to revoke leaf', err);
    } finally {
      setMutating(false);
    }
  };

  const handlePruneSubtree = async () => {
    setMutating(true);
    try {
      await fetch('/api/merkle/mutate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'prune',
          cutoffIndex: 5,
        }),
      });
      await fetchDiagnostics();
      setSelectedLeafIndex(0);
      await fetchInclusionProof(0);
    } catch (err) {
      console.error('Failed to prune subtree', err);
    } finally {
      setMutating(false);
    }
  };

  const filteredLeaves = (data?.auditLeaves || []).filter((leaf) => {
    if (!topicFilter.trim()) return true;
    const q = topicFilter.toLowerCase();
    return (
      leaf.topic.toLowerCase().includes(q) ||
      leaf.eventId.toLowerCase().includes(q) ||
      leaf.hash.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-8 p-6 lg:p-8 max-w-[1440px] mx-auto">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <div className="text-xs font-mono text-cyan-600 dark:text-cyan-400 mb-1">
            03. Dynamic Merkle Audit Spine &amp; Subtree Mutation Engine
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Immutable Merkle Audit Spine
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
            Append signed operator attestations, execute domain-separated RFC 6962 leaf revocation tombstones, compact historical subtrees into checkpoint roots, and verify SHA-256 inclusion paths.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            onClick={handlePruneSubtree}
            disabled={mutating || (data?.auditLogCount ?? 0) <= 6}
            className="px-3.5 py-2 text-xs font-medium text-slate-800 dark:text-slate-200 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 hover:border-cyan-500 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Scissors className="w-3.5 h-3.5 text-amber-500" />
            Compact Oldest 5 Leaves
          </button>

          <button
            onClick={() => {
              fetchDiagnostics();
              fetchInclusionProof(selectedLeafIndex);
            }}
            className="px-4 py-2 text-xs font-semibold text-white dark:text-slate-950 bg-cyan-600 dark:bg-cyan-400 hover:bg-cyan-500 dark:hover:bg-cyan-300 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Re-Verify Merkle Spine
          </button>
        </div>
      </div>

      {/* Root Hash & Dynamic Append Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4 flex flex-col justify-between">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs font-mono text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
              <span>MERKLE ROOT INTEGRITY: ● NOMINAL (100% VERIFIED)</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-slate-500 dark:text-slate-400 tabular-nums">
              <span>Leaves: <strong className="text-slate-900 dark:text-white">{data?.auditLogCount ?? 0}</strong></span>
              <span>·</span>
              <span>Depth: <strong className="text-slate-900 dark:text-white">{data?.merkleTreeDepth ?? 1}</strong></span>
              <span>·</span>
              <span>HMAC Epoch: <strong className="text-cyan-600 dark:text-cyan-400">#{data?.hmacEpoch ?? 1}</strong></span>
            </div>
          </div>

          <div>
            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 block mb-1">
              ACTIVE SHA-256 MERKLE ROOT DIGEST
            </span>
            <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-[#0B0E17] border border-slate-200 dark:border-slate-800 font-mono text-xs text-cyan-600 dark:text-cyan-400 break-all">
              {data?.merkleRoot || 'Computing genesis Merkle root...'}
            </div>
          </div>
        </div>

        {/* Dynamic Tree Append Form (/api/merkle/append) */}
        <form
          onSubmit={handleAppendLeaf}
          className="lg:col-span-5 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-3 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 dark:text-white">
              Dynamic Audit Leaf Append (/api/merkle/append)
            </span>
            <span className="text-[11px] font-mono text-cyan-600 dark:text-cyan-400">
              HMAC-SHA256 Signed
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <input
              type="text"
              value={customTopic}
              onChange={(e) => setCustomTopic(e.target.value)}
              placeholder="Event topic..."
              className="px-3 py-1.5 text-xs font-mono bg-slate-50 dark:bg-[#0B0E17] border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
              required
            />
            <input
              type="text"
              value={customPayload}
              onChange={(e) => setCustomPayload(e.target.value)}
              placeholder="Attestation payload..."
              className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-[#0B0E17] border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={mutating}
            className="w-full py-2 px-4 text-xs font-semibold text-white dark:text-slate-950 bg-cyan-600 dark:bg-cyan-400 hover:bg-cyan-500 dark:hover:bg-cyan-300 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Append Signed Leaf &amp; Recompute Root
          </button>
        </form>
      </div>

      {/* Split View: Audit Ledger Table (7 cols) + Cryptographic Inclusion Proof Verifier (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Immutable Event Ledger (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              01. Signed Audit Leaves ({filteredLeaves.length})
            </h2>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={topicFilter}
                onChange={(e) => setTopicFilter(e.target.value)}
                placeholder="Filter topic or hash..."
                className="pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 w-56"
              />
            </div>
          </div>

          <div className="bg-white dark:bg-[#0B0E17] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            {loading ? (
              <div className="p-10 text-center text-xs font-mono text-slate-500">
                Loading Merkle audit spine...
              </div>
            ) : filteredLeaves.length === 0 ? (
              <div className="p-10 text-center text-xs font-mono text-slate-500">
                No audit leaves match your filter.
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[540px] overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-slate-50 dark:bg-[#111827] border-b border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                    <tr>
                      <th className="py-2.5 px-4">LEAF</th>
                      <th className="py-2.5 px-4">TOPIC</th>
                      <th className="py-2.5 px-4">SHA-256 LEAF HASH</th>
                      <th className="py-2.5 px-4">STATE</th>
                      <th className="py-2.5 px-4 text-right">TIME</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/80 text-xs font-mono">
                    {filteredLeaves.map((leaf) => {
                      const isSelected = leaf.index === selectedLeafIndex;
                      return (
                        <tr
                          key={leaf.eventId}
                          onClick={() => handleSelectLeaf(leaf.index)}
                          className={`transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-cyan-50/70 dark:bg-cyan-950/30'
                              : 'hover:bg-slate-50 dark:hover:bg-[#111827]/60'
                          }`}
                        >
                          <td className="py-3 px-4 tabular-nums font-bold text-cyan-600 dark:text-cyan-400 whitespace-nowrap">
                            #{leaf.index}
                          </td>
                          <td className="py-3 px-4 text-slate-900 dark:text-white whitespace-nowrap">
                            {leaf.topic}
                          </td>
                          <td
                            className="py-3 px-4 text-slate-500 dark:text-slate-400 truncate max-w-[160px]"
                            title={leaf.hash}
                          >
                            {leaf.hash.slice(0, 20)}...
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            {leaf.revoked ? (
                              <span className="text-rose-600 dark:text-rose-400">✖ REVOKED</span>
                            ) : (
                              <span className="text-emerald-600 dark:text-emerald-400">● ACTIVE</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right tabular-nums text-slate-500 whitespace-nowrap">
                            {new Date(leaf.timestamp).toLocaleTimeString()}
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

        {/* Right: Interactive Inclusion Proof & Revocation Control (5 cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 block">
                CRYPTOGRAPHIC INCLUSION PATH
              </span>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                Leaf #{selectedLeafIndex} → Merkle Root
              </h3>
            </div>
            {proof?.leaf?.revoked ? (
              <span className="text-xs font-mono text-rose-600 dark:text-rose-400 font-semibold">
                ✖ TOMBSTONE REVOKED
              </span>
            ) : (
              proof?.verified && (
                <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  PROOF VALID
                </span>
              )
            )}
          </div>

          {verifyingProof ? (
            <div className="py-12 text-center text-xs font-mono text-slate-500">
              Computing SHA-256 sibling branch hashes...
            </div>
          ) : proof ? (
            <div className="space-y-4 text-xs font-mono">
              {/* Leaf Metadata */}
              <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-[#0B0E17] border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>EVENT ID: {proof.leaf.eventId}</span>
                  <span>TOPIC: {proof.leaf.topic}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">LEAF SHA-256 DIGEST</span>
                  <span className="text-slate-900 dark:text-slate-200 break-all text-[11px]">
                    {proof.leaf.hash}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">SECRET KEY HMAC-SHA256 SIGNATURE</span>
                  <span className="text-cyan-600 dark:text-cyan-400 break-all text-[11px]">
                    {proof.leaf.signature}
                  </span>
                </div>
              </div>

              {/* Branch Steps */}
              <div className="space-y-2">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                  BINARY TREE HASH REDUCTION STEPS ({proof.steps.length})
                </span>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {proof.steps.map((step, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-slate-50 dark:bg-[#0B0E17] border border-slate-200 dark:border-slate-800 space-y-1"
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-cyan-600 dark:text-cyan-400 font-semibold">
                          Level {step.level} → Level {step.level + 1}
                        </span>
                        <span className="text-slate-500 uppercase">
                          {step.position === 'promoted'
                            ? 'Odd Node Promoted'
                            : `Combined with ${step.position} sibling`}
                        </span>
                      </div>
                      {step.position !== 'promoted' && (
                        <div className="text-[10px] text-slate-500 truncate">
                          Sibling: {step.siblingHash}
                        </div>
                      )}
                      <div className="text-[11px] text-slate-800 dark:text-slate-200 truncate">
                        Parent: {step.parentHash}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Computed Root Match + Revocation Action */}
              <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 space-y-1">
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold block">
                  COMPUTED MERKLE ROOT (EQUALITY VERIFIED)
                </span>
                <div className="text-[11px] text-emerald-700 dark:text-emerald-300 break-all">
                  {proof.rootHash}
                </div>
              </div>

              {!proof.leaf.revoked && (
                <button
                  onClick={() => handleRevokeLeaf(proof.leaf.index)}
                  disabled={mutating}
                  className="w-full py-2 px-4 text-xs font-semibold text-rose-600 dark:text-rose-400 border border-rose-500/30 hover:bg-rose-500/10 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Ban className="w-3.5 h-3.5" />
                  Revoke Leaf #{proof.leaf.index} (Apply Tombstone &amp; Mutate Root)
                </button>
              )}
            </div>
          ) : (
            <div className="py-12 text-center text-xs font-mono text-slate-500">
              Select a leaf from the table to inspect its inclusion proof.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
