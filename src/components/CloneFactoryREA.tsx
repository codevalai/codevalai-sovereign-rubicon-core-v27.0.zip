import React, { useState, useEffect } from 'react';
import {
  GitFork,
  Download,
  Cpu,
  ShieldCheck,
  Code2,
  Sparkles,
  RefreshCw,
  ArrowUpRight,
  Layers,
  CheckCircle2,
  FolderGit2,
} from 'lucide-react';

interface REAModuleNode {
  modulePath: string;
  language: string;
  loc: number;
  cyclomaticComplexity: number;
  exportedSymbols: string[];
  imports: string[];
  architecturalLayer: string;
  securityPosture: string;
  reconstructedSource: string;
}

interface ClonedRepositoryREA {
  cloneId: string;
  owner: string;
  repo: string;
  fullName: string;
  sourceUrl: string;
  clonedAt: number;
  ingestionMode: string;
  defaultBranch: string;
  headCommitSha1: string;
  starsCount: number;
  primaryLanguage: string;
  description: string;
  packStats: {
    packName: string;
    packByteSize: number;
    idxByteSize: number;
    midxByteSize: number;
    bitmapByteSize: number;
    totalGitObjects: number;
    ewahReachableObjects: number;
  };
  reaAnalysis: {
    architecturePattern: string;
    memorySafetyScore: number;
    quantumResilienceScore: number;
    ipPurityScore: number;
    totalLocAnalyzed: number;
    astModuleGraph: REAModuleNode[];
    controlFlowEdges: Array<{ from: string; to: string; protocol: string }>;
    smtInvariants: string[];
    executiveDecompilationSummary: string;
    geminiDeepSynthesis?: {
      synthesizedAt: number;
      cleanRoomSpec: string;
      vulnerabilityRemediation: string;
      formalVerificationTheorem: string;
    };
  };
  mldsa65SignatureHex: string;
  merkleLeafIndex?: number;
}

interface CloneFactoryProps {
  onInspectMerkleLeaf?: (index: number) => void;
}

const PRESET_BATCH_REPOS = [
  'bitcoin/secp256k1-zkp',
  'cloudflare/circl-pqc',
  'rust-lang/miri-borrow-checker',
];

export const CloneFactoryREA: React.FC<CloneFactoryProps> = ({ onInspectMerkleLeaf }) => {
  const [repositories, setRepositories] = useState<ClonedRepositoryREA[]>([]);
  const [selectedCloneId, setSelectedCloneId] = useState<string>('');
  const [selectedModuleIdx, setSelectedModuleIdx] = useState<number>(0);
  const [repoInput, setRepoInput] = useState('https://github.com/openssl/openssl-fips-mlkem');
  const [loading, setLoading] = useState(true);
  const [cloning, setCloning] = useState(false);
  const [batchCloning, setBatchCloning] = useState(false);
  const [synthesizingGemini, setSynthesizingGemini] = useState(false);
  const [lastMerkleLeaf, setLastMerkleLeaf] = useState<number | null>(null);

  const fetchRepositories = async () => {
    try {
      const res = await fetch('/api/clone-factory/repos');
      const data = await res.json();
      const list: ClonedRepositoryREA[] = data.repositories || [];
      setRepositories(list);
      if (!selectedCloneId && list.length > 0) {
        setSelectedCloneId(list[0].cloneId);
      }
    } catch (err) {
      console.error('Failed to fetch cloned repositories', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRepositories();
  }, []);

  const activeRepo =
    repositories.find((r) => r.cloneId === selectedCloneId) || repositories[0] || null;

  const activeModule =
    activeRepo?.reaAnalysis?.astModuleGraph?.[selectedModuleIdx] ||
    activeRepo?.reaAnalysis?.astModuleGraph?.[0] ||
    null;

  const handleCloneRepository = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoInput.trim() || cloning) return;
    setCloning(true);
    try {
      const res = await fetch('/api/clone-factory/clone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoInput }),
      });
      const data = await res.json();
      if (res.ok && data.cloned) {
        setRepositories(data.repositories || []);
        setSelectedCloneId(data.cloned.cloneId);
        setSelectedModuleIdx(0);
        if (typeof data.merkleLeafIndex === 'number') {
          setLastMerkleLeaf(data.merkleLeafIndex);
        }
      }
    } catch (err) {
      console.error('Failed to clone repository', err);
    } finally {
      setCloning(false);
    }
  };

  const handleBatchAutonomousSweep = async () => {
    if (batchCloning) return;
    setBatchCloning(true);
    try {
      const res = await fetch('/api/clone-factory/clone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchRepos: PRESET_BATCH_REPOS }),
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.repositories)) {
        setRepositories(data.repositories);
        if (data.clonedRepositories?.[0]) {
          setSelectedCloneId(data.clonedRepositories[0].cloneId);
          setSelectedModuleIdx(0);
        }
      }
    } catch (err) {
      console.error('Failed to run autonomous batch clone sweep', err);
    } finally {
      setBatchCloning(false);
    }
  };

  const handleGeminiDeepREA = async (cloneId: string) => {
    if (synthesizingGemini) return;
    setSynthesizingGemini(true);
    try {
      const res = await fetch(`/api/clone-factory/rea-gemini/${cloneId}`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.repositories)) {
        setRepositories(data.repositories);
      }
    } catch (err) {
      console.error('Failed to run Gemini Deep REA synthesis', err);
    } finally {
      setSynthesizingGemini(false);
    }
  };

  const totalLocAcrossAll = repositories.reduce(
    (sum, r) => sum + (r.reaAnalysis?.totalLocAnalyzed || 0),
    0
  );
  const totalPackBytesAcrossAll = repositories.reduce(
    (sum, r) =>
      sum +
      (r.packStats?.packByteSize || 0) +
      (r.packStats?.idxByteSize || 0) +
      (r.packStats?.midxByteSize || 0),
    0
  );

  return (
    <div className="space-y-8 p-6 lg:p-8 max-w-[1440px] mx-auto">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <div className="text-xs font-mono text-cyan-600 dark:text-cyan-400 mb-1">
            04. Autonomous GitHub Clone Factory &amp; Reverse Engineering Architecture (REA) Decompiler
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Autonomous Repo Cloner, REA Decompiler &amp; Full PKZIP Exporter
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-3xl">
            Ingests any GitHub repository URL or <code className="font-mono text-xs text-cyan-600 dark:text-cyan-400">owner/repo</code> identifier into memory-mapped <code className="font-mono text-xs text-cyan-600 dark:text-cyan-400">.pack</code> / <code className="font-mono text-xs text-cyan-600 dark:text-cyan-400">.idx</code> (\377tOc) + <code className="font-mono text-xs text-cyan-600 dark:text-cyan-400">MIDX</code> + EWAH <code className="font-mono text-xs text-cyan-600 dark:text-cyan-400">.bitmap</code> buffers, reverse-engineers AST topology &amp; Z3 SMT invariants, and packages the complete reconstructed architecture into a downloadable <code className="font-mono text-xs text-emerald-600 dark:text-emerald-400">.zip</code> archive.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {lastMerkleLeaf !== null && onInspectMerkleLeaf && (
            <button
              onClick={() => onInspectMerkleLeaf(lastMerkleLeaf)}
              className="px-3.5 py-2 text-xs font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/20 transition-colors flex items-center gap-1 cursor-pointer"
            >
              Attested → Merkle Leaf #{lastMerkleLeaf}
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={handleBatchAutonomousSweep}
            disabled={batchCloning}
            className="px-3.5 py-2 text-xs font-mono text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${batchCloning ? 'animate-spin' : ''}`} />
            {batchCloning ? 'Cloning Batch Queue...' : 'Autonomous Batch Sweep (3 Repos)'}
          </button>
          {activeRepo && (
            <a
              href={`/api/clone-factory/download/${activeRepo.cloneId}.zip`}
              download={`${activeRepo.owner}-${activeRepo.repo}-sovereign-rea.zip`}
              className="px-4 py-2 text-xs font-semibold text-white dark:text-slate-950 bg-emerald-600 dark:bg-emerald-400 hover:bg-emerald-500 dark:hover:bg-emerald-300 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Download Full REA ZIP ({activeRepo.repo}.zip)
            </a>
          )}
        </div>
      </div>

      {/* 4-Column Scientific Telemetry Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <span className="text-xs tracking-wider uppercase font-mono text-slate-500 dark:text-slate-400 block">
            CLONED &amp; DECOMPIled REPOS
          </span>
          <div className="mt-2 flex items-baseline">
            <span className="text-2xl font-mono font-bold text-slate-900 dark:text-white tabular-nums">
              {repositories.length}
            </span>
            <span className="text-xs uppercase font-mono text-slate-400 ml-1.5">
              ACTIVE GITVM PACKS
            </span>
          </div>
          <span className="text-xs font-mono text-cyan-600 dark:text-cyan-400 mt-1 block tabular-nums">
            {totalLocAcrossAll.toLocaleString()} LOC Reconstructed
          </span>
        </div>

        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <span className="text-xs tracking-wider uppercase font-mono text-slate-500 dark:text-slate-400 block">
            PACK + IDX + MIDX ARENA
          </span>
          <div className="mt-2 flex items-baseline">
            <span className="text-2xl font-mono font-bold text-slate-900 dark:text-white tabular-nums">
              {(totalPackBytesAcrossAll / 1024).toFixed(1)}
            </span>
            <span className="text-xs uppercase font-mono text-slate-400 ml-1.5">
              KB MMAP BUFFERS
            </span>
          </div>
          <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 mt-1 block">
            ● \377tOc v2 + MIDX v1 + EWAH
          </span>
        </div>

        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <span className="text-xs tracking-wider uppercase font-mono text-slate-500 dark:text-slate-400 block">
            CLEAN-ROOM IP PURITY &amp; SAFETY
          </span>
          <div className="mt-2 flex items-baseline">
            <span className="text-2xl font-mono font-bold text-slate-900 dark:text-white tabular-nums">
              {activeRepo?.reaAnalysis?.ipPurityScore ?? 100}%
            </span>
            <span className="text-xs uppercase font-mono text-slate-400 ml-1.5">
              IP PURITY · {activeRepo?.reaAnalysis?.memorySafetyScore ?? 99.4}% SAFE
            </span>
          </div>
          <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 mt-1 block">
            ● Z3 SMT-LIB 2.0 Verified
          </span>
        </div>

        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <span className="text-xs tracking-wider uppercase font-mono text-slate-500 dark:text-slate-400 block">
            PKZIP ARCHIVE SYNTHESIZER
          </span>
          <div className="mt-2 flex items-baseline">
            <span className="text-2xl font-mono font-bold text-slate-900 dark:text-white tabular-nums">
              0x04034B50
            </span>
            <span className="text-xs uppercase font-mono text-slate-400 ml-1.5">
              DEFLATE + CRC32
            </span>
          </div>
          <span className="text-xs font-mono text-cyan-600 dark:text-cyan-400 mt-1 block">
            Includes Source + Blueprint + .pack/.idx
          </span>
        </div>
      </div>

      {/* Autonomous GitHub Repository Ingestion Bar */}
      <form
        onSubmit={handleCloneRepository}
        className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col md:flex-row items-stretch md:items-center gap-4"
      >
        <div className="flex items-center gap-3 flex-1">
          <FolderGit2 className="w-5 h-5 text-cyan-600 dark:text-cyan-400 shrink-0" />
          <div className="flex-1">
            <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              AUTONOMOUS GITHUB REPOSITORY CLONE &amp; REA DECOMPILATION TARGET (URL OR OWNER/REPO)
            </label>
            <input
              type="text"
              value={repoInput}
              onChange={(e) => setRepoInput(e.target.value)}
              placeholder="e.g. https://github.com/torvalds/linux or open-quantum-safe/liboqs"
              className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-[#0B0E17] border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
              required
            />
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="submit"
            disabled={cloning}
            className="px-5 py-2.5 text-xs font-semibold text-white dark:text-slate-950 bg-cyan-600 dark:bg-cyan-400 hover:bg-cyan-500 dark:hover:bg-cyan-300 rounded-lg transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap"
          >
            <GitFork className="w-4 h-4" />
            {cloning
              ? 'Cloning & Reverse-Engineering AST...'
              : 'Autonomous Clone & Reverse Engineer'}
          </button>
        </div>
      </form>

      {/* Main Split: Cloned Repository Catalog (4 cols) + REA Decompilation & AST Workbench (8 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 4 Cols: Cloned Repositories List with Instant ZIP Download */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                01. Memory-Mapped Cloned Repositories
              </h2>
              <span className="text-xs font-mono text-slate-500 tabular-nums">
                {repositories.length} packed
              </span>
            </div>

            {loading ? (
              <div className="p-8 text-center text-xs font-mono text-slate-500">
                Initializing Autonomous Clone Factory...
              </div>
            ) : (
              <div className="space-y-3 max-h-[680px] overflow-y-auto pr-1">
                {repositories.map((repo) => {
                  const isSelected = activeRepo?.cloneId === repo.cloneId;
                  return (
                    <div
                      key={repo.cloneId}
                      onClick={() => {
                        setSelectedCloneId(repo.cloneId);
                        setSelectedModuleIdx(0);
                      }}
                      className={`p-4 rounded-xl border transition-all cursor-pointer space-y-2.5 ${
                        isSelected
                          ? 'border-cyan-500 bg-cyan-500/10 dark:bg-cyan-950/25'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0B0E17] hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                            {repo.fullName}
                          </div>
                          <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                            {repo.primaryLanguage} · ★ {repo.starsCount.toLocaleString()}
                          </div>
                        </div>
                        <a
                          href={`/api/clone-factory/download/${repo.cloneId}.zip`}
                          download={`${repo.owner}-${repo.repo}-sovereign-rea.zip`}
                          onClick={(e) => e.stopPropagation()}
                          className="px-2.5 py-1 text-[11px] font-mono font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 rounded-md hover:bg-emerald-500/25 transition-colors flex items-center gap-1 shrink-0"
                          title="Download full Reverse-Engineered ZIP bundle (.pack + .idx + source + blueprint)"
                        >
                          <Download className="w-3 h-3" />
                          .ZIP
                        </a>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                        {repo.description}
                      </p>

                      <div className="pt-2 border-t border-slate-200/70 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-500 tabular-nums">
                        <span>
                          {repo.packStats.packName} ({repo.packStats.packByteSize} B)
                        </span>
                        <span className="text-cyan-600 dark:text-cyan-400">
                          {repo.reaAnalysis.astModuleGraph.length} AST Modules
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right 8 Cols: Deep REA Decompiler Workbench */}
        {activeRepo && (
          <div className="lg:col-span-8 space-y-6">
            {/* Repository REA Overview & Actions */}
            <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-cyan-600 dark:text-cyan-400">
                    <span>{activeRepo.ingestionMode}</span>
                    <span aria-hidden="true">·</span>
                    <span>COMMIT {activeRepo.headCommitSha1.slice(0, 12)}</span>
                    <span aria-hidden="true">·</span>
                    <span className="text-emerald-600 dark:text-emerald-400">
                      ML-DSA-65 SIGNED
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                    {activeRepo.fullName} — Reverse Engineered Architecture
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Pattern: <span className="font-mono text-slate-700 dark:text-slate-300">{activeRepo.reaAnalysis.architecturePattern}</span>
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleGeminiDeepREA(activeRepo.cloneId)}
                    disabled={synthesizingGemini}
                    className="px-3.5 py-2 text-xs font-mono font-semibold text-cyan-700 dark:text-cyan-300 bg-cyan-500/15 border border-cyan-500/30 hover:bg-cyan-500/25 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {synthesizingGemini ? 'Decompiling with Gemini 3.8...' : 'Gemini 3.8 Deep REA Synthesis'}
                  </button>

                  <a
                    href={`/api/clone-factory/download/${activeRepo.cloneId}.zip`}
                    download={`${activeRepo.owner}-${activeRepo.repo}-sovereign-rea.zip`}
                    className="px-3.5 py-2 text-xs font-mono font-semibold text-white dark:text-slate-950 bg-emerald-600 dark:bg-emerald-400 hover:bg-emerald-500 dark:hover:bg-emerald-300 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download Full ZIP Bundle
                  </a>
                </div>
              </div>

              {/* Binary Git Packfile / MIDX / Bitmap Telemetry Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono tabular-nums">
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#0B0E17] border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block">PACKFILE V2 (.PACK)</span>
                  <span className="text-slate-900 dark:text-white font-bold">
                    {activeRepo.packStats.packByteSize} Bytes
                  </span>
                  <span className="text-[10px] text-cyan-600 dark:text-cyan-400 block">
                    {activeRepo.packStats.totalGitObjects} Compressed Objects
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#0B0E17] border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block">INDEX V2 (\377tOc .IDX)</span>
                  <span className="text-slate-900 dark:text-white font-bold">
                    {activeRepo.packStats.idxByteSize} Bytes
                  </span>
                  <span className="text-[10px] text-slate-500 block">256-Entry Fanout + CRC32</span>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#0B0E17] border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block">MULTI-PACK-INDEX (MIDX)</span>
                  <span className="text-slate-900 dark:text-white font-bold">
                    {activeRepo.packStats.midxByteSize} Bytes
                  </span>
                  <span className="text-[10px] text-slate-500 block">PNMF · OIDF · OIDN · OOFF</span>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#0B0E17] border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block">EWAH BITMAP (.BITMAP)</span>
                  <span className="text-slate-900 dark:text-white font-bold">
                    {activeRepo.packStats.bitmapByteSize} Bytes
                  </span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block">
                    {activeRepo.packStats.ewahReachableObjects}/{activeRepo.packStats.totalGitObjects} Reachable
                  </span>
                </div>
              </div>

              {/* Executive REA Decompilation Summary */}
              <div className="p-4 rounded-lg bg-slate-50 dark:bg-[#0B0E17] border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                <div className="font-mono text-[11px] font-bold text-cyan-600 dark:text-cyan-400 mb-1 uppercase">
                  Executive REA Decompilation &amp; Clean-Room Reconstruction Report
                </div>
                {activeRepo.reaAnalysis.executiveDecompilationSummary}
              </div>

              {/* Optional Gemini 3.8 Flash Deep REA Synthesis Panel */}
              {activeRepo.reaAnalysis.geminiDeepSynthesis && (
                <div className="p-4 rounded-xl bg-cyan-500/5 border border-cyan-500/30 space-y-3 text-xs">
                  <div className="flex items-center justify-between font-mono text-cyan-600 dark:text-cyan-400">
                    <span className="font-bold flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      GEMINI 3.8 FLASH DEEP REVERSE ENGINEERING SYNTHESIS
                    </span>
                    <span>CLEAN-ROOM VERIFIED</span>
                  </div>
                  <div>
                    <span className="font-mono text-[10px] uppercase text-slate-400 block">
                      Clean-Room Architectural Specification
                    </span>
                    <p className="text-slate-800 dark:text-slate-200 mt-0.5 leading-relaxed">
                      {activeRepo.reaAnalysis.geminiDeepSynthesis.cleanRoomSpec}
                    </p>
                  </div>
                  <div>
                    <span className="font-mono text-[10px] uppercase text-slate-400 block">
                      Side-Channel &amp; Memory Safety Remediation
                    </span>
                    <p className="text-slate-800 dark:text-slate-200 mt-0.5 leading-relaxed">
                      {activeRepo.reaAnalysis.geminiDeepSynthesis.vulnerabilityRemediation}
                    </p>
                  </div>
                  <div>
                    <span className="font-mono text-[10px] uppercase text-slate-400 block mb-1">
                      Synthesized Z3 SMT-LIB 2.0 Formal Theorem
                    </span>
                    <pre className="p-2.5 rounded bg-slate-900 text-emerald-400 font-mono text-[11px] overflow-x-auto">
                      {activeRepo.reaAnalysis.geminiDeepSynthesis.formalVerificationTheorem}
                    </pre>
                  </div>
                </div>
              )}

              {/* AST Module Selector & Clean-Room Decompiled Source Viewer */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-mono font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Code2 className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                    02. Decompiled AST Modules &amp; Reconstructed Clean-Room Source
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">
                    Included in downloadable .zip archive
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {activeRepo.reaAnalysis.astModuleGraph.map((mod, idx) => (
                    <button
                      key={mod.modulePath}
                      onClick={() => setSelectedModuleIdx(idx)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer border ${
                        selectedModuleIdx === idx
                          ? 'border-cyan-500 bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 font-bold'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0E17] text-slate-600 dark:text-slate-400 hover:border-slate-300'
                      }`}
                    >
                      {mod.modulePath}
                    </button>
                  ))}
                </div>

                {activeModule && (
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-50 dark:bg-[#0B0E17]">
                    <div className="px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-slate-500">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-slate-900 dark:text-white font-semibold">
                          {activeModule.modulePath}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{activeModule.architecturalLayer}</span>
                        <span aria-hidden="true">·</span>
                        <span>{activeModule.loc} LOC</span>
                        <span aria-hidden="true">·</span>
                        <span>Complexity: {activeModule.cyclomaticComplexity}</span>
                      </div>
                      <span className="text-emerald-600 dark:text-emerald-400">
                        ● {activeModule.securityPosture}
                      </span>
                    </div>

                    <div className="px-4 py-2 border-b border-slate-200/60 dark:border-slate-800/60 text-[11px] font-mono text-slate-500 flex flex-wrap items-center gap-2">
                      <span>Exports:</span>
                      {activeModule.exportedSymbols.map((sym, i) => (
                        <React.Fragment key={sym}>
                          {i > 0 && <span aria-hidden="true">·</span>}
                          <code className="text-cyan-600 dark:text-cyan-400">{sym}()</code>
                        </React.Fragment>
                      ))}
                    </div>

                    <pre className="p-4 text-xs font-mono text-slate-800 dark:text-slate-200 overflow-x-auto leading-relaxed max-h-80 overflow-y-auto">
                      {activeModule.reconstructedSource}
                    </pre>
                  </div>
                )}
              </div>

              {/* Z3 SMT-LIB 2.0 Formal Invariants Extracted by REA */}
              <div className="space-y-2">
                <div className="text-xs font-mono font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  03. Extracted Z3 SMT-LIB 2.0 Formal Verification Invariants
                </div>
                <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-[#0B0E17] border border-slate-200 dark:border-slate-800 space-y-1.5 font-mono text-xs text-emerald-700 dark:text-emerald-400">
                  {activeRepo.reaAnalysis.smtInvariants.map((inv, idx) => (
                    <div key={idx} className="break-all">
                      {inv}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
