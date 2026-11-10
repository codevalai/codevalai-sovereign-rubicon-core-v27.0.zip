/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { SwarmParliament } from './components/SwarmParliament';
import { CryptoLattice } from './components/CryptoLattice';
import { GitVMHypergrid } from './components/GitVMHypergrid';
import { CloneFactoryREA } from './components/CloneFactoryREA';
import { OmniApexHDC100View } from './components/OmniApexHDC100View';
import { MerkleSpine } from './components/MerkleSpine';
import { GeminiStrategist } from './components/GeminiStrategist';
import { DiagnosticsView } from './components/DiagnosticsView';
import { TaskModal } from './components/TaskModal';
import { Sun, Moon, Activity, Sparkles, GitCommit } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('hdc100');
  const [isDispatchOpen, setIsDispatchOpen] = useState(false);
  const [defaultDispatchAgent, setDefaultDispatchAgent] = useState<string | undefined>(undefined);
  const [inspectedMerkleLeaf, setInspectedMerkleLeaf] = useState<number | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [darkMode, setDarkMode] = useState(true);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const handleOpenDispatch = (agentId?: string) => {
    setDefaultDispatchAgent(agentId);
    setIsDispatchOpen(true);
  };

  const handleInspectMerkleLeaf = (leafIndex: number) => {
    setInspectedMerkleLeaf(leafIndex);
    setActiveTab('merkle');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#07090E] text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenDispatch={() => handleOpenDispatch()}
      />

      {/* Contextual Workspace Sub-Bar */}
      <div className="border-b border-slate-200 dark:border-slate-800/80 bg-slate-100/70 dark:bg-[#0B0E17]/70 px-6 py-2">
        <div className="max-w-[1440px] mx-auto flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-slate-600 dark:text-slate-400">
          <div className="flex flex-wrap items-center gap-2">
            <span>OMEGA-BINIUS SINGULARITY v26.1</span>
            <span aria-hidden="true">·</span>
            <span>GF(2^128) BINARY-TOWER + CANTOR NTT</span>
            <span aria-hidden="true">·</span>
            <span>HaPPY [[5,1,3]] (I+S_L)^-1 BIJECTION</span>
            <span aria-hidden="true">·</span>
            <span className="text-emerald-600 dark:text-emerald-400">● 6-STAGE CLOSED-LOOP LIVE</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Mobile view navigation buttons */}
            <div className="flex md:hidden items-center gap-1">
              {(['swarm', 'crypto', 'gitvm', 'clonefactory', 'hdc100', 'merkle'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-2 py-1 rounded text-[11px] capitalize ${
                    activeTab === tab
                      ? 'bg-cyan-600 text-white dark:bg-cyan-400 dark:text-slate-950 font-semibold'
                      : 'text-slate-500'
                  }`}
                >
                  {tab === 'clonefactory' ? 'Clone' : tab === 'hdc100' ? 'HDC-100' : tab}
                </button>
              ))}
            </div>

            <button
              onClick={() => setActiveTab('merkle')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-mono transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'merkle'
                  ? 'border-cyan-500 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-semibold'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] text-slate-700 dark:text-slate-300 hover:border-cyan-500'
              }`}
            >
              <GitCommit className="w-3.5 h-3.5 text-emerald-500" />
              <span>Merkle Audit Spine</span>
            </button>

            <button
              onClick={() => setActiveTab('gemini')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-mono transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'gemini'
                  ? 'border-cyan-500 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-semibold'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] text-slate-700 dark:text-slate-300 hover:border-cyan-500'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-500" />
              <span>Gemini 3.8 Strategist</span>
            </button>

            <button
              onClick={() => setActiveTab('diagnostics')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-mono transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'diagnostics'
                  ? 'border-cyan-500 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-semibold'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] text-slate-700 dark:text-slate-300 hover:border-cyan-500'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-cyan-500" />
              <span>Telemetry &amp; SSE</span>
            </button>

            <button
              onClick={() => setDarkMode(!darkMode)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] text-slate-700 dark:text-slate-300 hover:border-cyan-500 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              {darkMode ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-slate-600" />}
              <span>{darkMode ? 'Clinical Light' : 'Obsidian Dark'}</span>
            </button>
          </div>
        </div>
      </div>

      <main className="flex-1">
        {activeTab === 'swarm' && (
          <SwarmParliament
            onOpenDispatch={handleOpenDispatch}
            onInspectMerkleLeaf={handleInspectMerkleLeaf}
            refreshTrigger={refreshTrigger}
          />
        )}
        {activeTab === 'crypto' && <CryptoLattice />}
        {activeTab === 'gitvm' && <GitVMHypergrid onInspectMerkleLeaf={handleInspectMerkleLeaf} />}
        {activeTab === 'clonefactory' && <CloneFactoryREA onInspectMerkleLeaf={handleInspectMerkleLeaf} />}
        {activeTab === 'hdc100' && <OmniApexHDC100View onInspectMerkleLeaf={handleInspectMerkleLeaf} />}
        {activeTab === 'merkle' && <MerkleSpine initialLeafIndex={inspectedMerkleLeaf} />}
        {activeTab === 'gemini' && (
          <GeminiStrategist
            onTasksDispatched={() => {
              setRefreshTrigger((prev) => prev + 1);
            }}
          />
        )}
        {activeTab === 'diagnostics' && <DiagnosticsView />}
      </main>

      <footer className="border-t border-slate-200 dark:border-slate-800 py-5 px-6 text-xs text-slate-500 dark:text-slate-500">
        <div className="max-w-[1440px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Sovereign Lattice &amp; Git-Native Virtual Machine (GitVM) Command Center v26.1 (Omega-Binius Singularity)</span>
          <div className="flex flex-wrap items-center gap-4">
            <button onClick={() => setActiveTab('crypto')} className="hover:text-slate-800 dark:hover:text-slate-300 cursor-pointer">
              Quantum Lattice
            </button>
            <button onClick={() => setActiveTab('gitvm')} className="hover:text-slate-800 dark:hover:text-slate-300 cursor-pointer">
              GitVM Hypergrid
            </button>
            <button onClick={() => setActiveTab('clonefactory')} className="hover:text-slate-800 dark:hover:text-slate-300 cursor-pointer">
              Clone Factory &amp; REA
            </button>
            <button onClick={() => setActiveTab('hdc100')} className="hover:text-slate-800 dark:hover:text-slate-300 cursor-pointer">
              HDC 1.58b &amp; 100 Workflows
            </button>
            <button onClick={() => setActiveTab('merkle')} className="hover:text-slate-800 dark:hover:text-slate-300 cursor-pointer">
              Merkle Audit Spine
            </button>
            <button onClick={() => setActiveTab('gemini')} className="hover:text-slate-800 dark:hover:text-slate-300 cursor-pointer">
              Gemini Strategist
            </button>
          </div>
        </div>
      </footer>

      <TaskModal
        isOpen={isDispatchOpen}
        defaultAgent={defaultDispatchAgent}
        onClose={() => setIsDispatchOpen(false)}
        onTaskDispatched={() => {
          setRefreshTrigger((prev) => prev + 1);
        }}
      />
    </div>
  );
}
