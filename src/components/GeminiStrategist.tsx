import React, { useState, useEffect } from 'react';
import { Send, RefreshCw, CheckCircle2, Play, ShieldCheck, AlertCircle, Cpu, Zap } from 'lucide-react';

interface RecommendedTask {
  namespace: string;
  assignedAgent: string;
  priority: number;
  directive: string;
}

interface StrategyPlan {
  executiveAssessment: string;
  threatPosture: string;
  invariantEquation: string;
  recommendedTasks: RecommendedTask[];
}

interface WatchdogPolicy {
  enabled: boolean;
  pollIntervalMs: number;
  minCryptoRigorThreshold: number;
  minComputeVelocityThreshold: number;
  autoRotateKeysOnBreach: boolean;
  autoRotateHmacOnBreach: boolean;
  autoSlashByzantineNodes: boolean;
}

interface WatchdogIncident {
  id: string;
  timestamp: number;
  nodeId: string;
  breachReason: string;
  detectedRigor: number;
  smtStatus: string;
  actionsTaken: string[];
  merkleLeafIndex: number;
}

interface GeminiStrategistProps {
  onTasksDispatched?: () => void;
}

export const GeminiStrategist: React.FC<GeminiStrategistProps> = ({ onTasksDispatched }) => {
  const [prompt, setPrompt] = useState(
    'Audit current Hybrid X25519 + ML-KEM-768 combiner entropy against side-channel leakage and synthesize a 3-stage formal SMT verification plan.'
  );
  const [plan, setPlan] = useState<StrategyPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [autoPilotDispatch, setAutoPilotDispatch] = useState(true);
  const [dispatchingAll, setDispatchingAll] = useState(false);
  const [dispatchedCount, setDispatchedCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [watchdogPolicy, setWatchdogPolicy] = useState<WatchdogPolicy | null>(null);
  const [watchdogIncidents, setWatchdogIncidents] = useState<WatchdogIncident[]>([]);
  const [watchdogCycles, setWatchdogCycles] = useState(0);
  const [testingBreaker, setTestingBreaker] = useState(false);

  const fetchWatchdogStatus = async () => {
    try {
      const res = await fetch('/api/watchdog/status');
      const data = await res.json();
      setWatchdogPolicy(data.policy);
      setWatchdogIncidents(data.recentIncidents || []);
      setWatchdogCycles(data.evaluationCycles || 0);
    } catch (err) {
      console.error('Failed to fetch watchdog status', err);
    }
  };

  useEffect(() => {
    fetchWatchdogStatus();
    const interval = setInterval(fetchWatchdogStatus, 3500);
    return () => clearInterval(interval);
  }, []);

  const handleUpdateWatchdogPolicy = async (partial: Partial<WatchdogPolicy>) => {
    try {
      const res = await fetch('/api/watchdog/policy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(partial),
      });
      const data = await res.json();
      setWatchdogPolicy(data.policy);
    } catch (err) {
      console.error('Failed to update watchdog policy', err);
    }
  };

  const handleSimulateBreachAndRemediate = async () => {
    setTestingBreaker(true);
    try {
      // 1. Inject SMT invariant failure + low crypto rigor on agent-velocity
      await fetch('/api/swarm/inject-fault', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodeId: 'agent-velocity', targetRigor: 74 }),
      });
      // 2. Immediately trigger AutonomousKernelDaemon evaluation cycle
      await fetch('/api/watchdog/evaluate', { method: 'POST' });
      await fetchWatchdogStatus();
      onTasksDispatched?.();
    } catch (err) {
      console.error('Failed to run circuit breaker test', err);
    } finally {
      setTestingBreaker(false);
    }
  };

  const presetQueries = [
    'Audit current Hybrid X25519 + ML-KEM-768 combiner entropy against side-channel leakage and synthesize a 3-stage formal SMT verification plan.',
    'Design a Byzantine fault-tolerant PBFT quorum rebalancing protocol across our 5 parliament agents under high-priority task saturation.',
    'Formulate clean-room IP provenance verification rules for FIPS 203 Number Theoretic Transform (NTT) assembly kernels.',
  ];

  const handleSynthesize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || loading) return;

    setLoading(true);
    setError(null);
    setDispatchedCount(null);

    try {
      const res = await fetch('/api/gemini/strategize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, autoDispatch: autoPilotDispatch }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || 'Strategy synthesis failed.');
      } else {
        setPlan(data.plan);
        if (Array.isArray(data.dispatchedTasks) && data.dispatchedTasks.length > 0) {
          setDispatchedCount(data.dispatchedTasks.length);
          onTasksDispatched?.();
        }
      }
    } catch (err: any) {
      setError(err.message || 'Network request failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleDispatchBatch = async () => {
    if (!plan?.recommendedTasks?.length || dispatchingAll) return;
    setDispatchingAll(true);
    try {
      const res = await fetch('/api/tasks/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tasks: plan.recommendedTasks.map((t) => ({
            namespace: t.namespace,
            assignedAgent: t.assignedAgent,
            priority: t.priority,
            payload: { directive: t.directive, strategist: 'gemini-3.8-flash' },
          })),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setDispatchedCount(data.count || plan.recommendedTasks.length);
        onTasksDispatched?.();
      }
    } catch (err) {
      console.error('Failed to dispatch batch', err);
    } finally {
      setDispatchingAll(false);
    }
  };

  const handleDispatchSingle = async (task: RecommendedTask) => {
    try {
      await fetch('/api/task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          namespace: task.namespace,
          assignedAgent: task.assignedAgent,
          priority: task.priority,
          payload: { directive: task.directive, strategist: 'gemini-3.8-flash' },
        }),
      });
      setDispatchedCount((prev) => (prev ?? 0) + 1);
      onTasksDispatched?.();
    } catch (err) {
      console.error('Failed to dispatch task', err);
    }
  };

  return (
    <div className="space-y-8 p-6 lg:p-8 max-w-[1440px] mx-auto">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <div className="text-xs font-mono text-cyan-600 dark:text-cyan-400 mb-1">
            04. Closed-Loop Autonomous Watchdog &amp; Gemini 3.8 Flash Strategist
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Gemini Strategist &amp; Auto-Pilot Daemon
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
            Configure the <code className="font-mono text-xs text-cyan-600 dark:text-cyan-400">AutonomousKernelDaemon</code> circuit breaker to automatically rotate hybrid keys and slash Byzantine nodes on SMT failure, or synthesize zero-defect directives with <code className="font-mono text-xs text-cyan-600 dark:text-cyan-400">gemini-3.8-flash</code>.
          </p>
        </div>

        <button
          onClick={handleSimulateBreachAndRemediate}
          disabled={testingBreaker}
          className="px-4 py-2 text-xs font-semibold text-amber-600 dark:text-amber-400 border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Zap className="w-3.5 h-3.5" />
          {testingBreaker ? 'Tripping Circuit Breaker...' : 'Test Autonomous Circuit Breaker'}
        </button>
      </div>

      {/* Autonomous Watchdog Loop & Circuit Breaker Policy Panel */}
      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <Cpu className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                01. AutonomousKernelDaemon Circuit Breaker Policy
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Continuously evaluates SMT invariants and node cryptographic rigor across the 5-node parliament ring.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="text-slate-500 tabular-nums">
              Daemon Evaluations: <strong className="text-slate-900 dark:text-white">{watchdogCycles}</strong>
            </span>
            <button
              onClick={() => handleUpdateWatchdogPolicy({ enabled: !watchdogPolicy?.enabled })}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                watchdogPolicy?.enabled
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
              }`}
            >
              {watchdogPolicy?.enabled ? '● WATCHDOG ARMED' : '○ WATCHDOG PAUSED'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Policy Controls (6 cols) */}
          <div className="lg:col-span-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-[#0B0E17] border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between text-xs font-mono mb-2">
                  <span className="text-slate-500">MIN CRYPTO RIGOR</span>
                  <span className="text-cyan-600 dark:text-cyan-400 font-bold tabular-nums">
                    {watchdogPolicy?.minCryptoRigorThreshold ?? 90}%
                  </span>
                </div>
                <input
                  type="range"
                  min={75}
                  max={98}
                  value={watchdogPolicy?.minCryptoRigorThreshold ?? 90}
                  onChange={(e) =>
                    handleUpdateWatchdogPolicy({ minCryptoRigorThreshold: Number(e.target.value) })
                  }
                  className="w-full accent-cyan-500 cursor-pointer"
                />
              </div>

              <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-[#0B0E17] border border-slate-200 dark:border-slate-800 space-y-2 text-xs font-mono">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-slate-700 dark:text-slate-300">Auto-Rotate Hybrid KEM</span>
                  <input
                    type="checkbox"
                    checked={watchdogPolicy?.autoRotateKeysOnBreach ?? true}
                    onChange={(e) =>
                      handleUpdateWatchdogPolicy({ autoRotateKeysOnBreach: e.target.checked })
                    }
                    className="accent-cyan-500"
                  />
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-slate-700 dark:text-slate-300">Auto-Rotate Swarm HMAC</span>
                  <input
                    type="checkbox"
                    checked={watchdogPolicy?.autoRotateHmacOnBreach ?? true}
                    onChange={(e) =>
                      handleUpdateWatchdogPolicy({ autoRotateHmacOnBreach: e.target.checked })
                    }
                    className="accent-cyan-500"
                  />
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-slate-700 dark:text-slate-300">PBFT Auto-Slashing</span>
                  <input
                    type="checkbox"
                    checked={watchdogPolicy?.autoSlashByzantineNodes ?? true}
                    onChange={(e) =>
                      handleUpdateWatchdogPolicy({ autoSlashByzantineNodes: e.target.checked })
                    }
                    className="accent-cyan-500"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Incident Log (6 cols) */}
          <div className="lg:col-span-6 space-y-2">
            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 block">
              AUTONOMOUS CIRCUIT BREAKER REMEDIATION LOG ({watchdogIncidents.length})
            </span>
            {watchdogIncidents.length === 0 ? (
              <div className="p-4 rounded-lg bg-slate-50 dark:bg-[#0B0E17] border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-500">
                No SMT invariant breaches detected. Click &quot;Test Autonomous Circuit Breaker&quot; above to simulate a node anomaly and observe automatic remediation.
              </div>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {watchdogIncidents.map((inc) => (
                  <div
                    key={inc.id}
                    className="p-3 rounded-lg bg-slate-50 dark:bg-[#0B0E17] border border-amber-500/30 text-xs font-mono space-y-1"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-amber-600 dark:text-amber-400 font-semibold">
                        {inc.id} · {inc.nodeId} ({inc.breachReason})
                      </span>
                      <span className="text-emerald-600 dark:text-emerald-400 tabular-nums">
                        Leaf #{inc.merkleLeafIndex}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600 dark:text-slate-300">
                      Actions: {inc.actionsTaken.join(' → ')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Input & Presets Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Prompt Workbench (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                02. Architectural Directive Input
              </h2>
              <label className="flex items-center gap-1.5 text-xs font-mono text-cyan-600 dark:text-cyan-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoPilotDispatch}
                  onChange={(e) => setAutoPilotDispatch(e.target.checked)}
                  className="accent-cyan-500"
                />
                Zero-Click Auto-Dispatch
              </label>
            </div>

            <form onSubmit={handleSynthesize} className="space-y-4">
              <div>
                <label className="block text-[11px] font-mono text-slate-500 dark:text-slate-400 mb-1.5">
                  THREAT MODEL OR SWARM OBJECTIVE
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={4}
                  placeholder="Describe the cryptographic, consensus, or compute problem..."
                  className="w-full p-3 text-xs bg-slate-50 dark:bg-[#0B0E17] border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 resize-none leading-relaxed"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !prompt.trim()}
                className="w-full py-2.5 px-4 bg-cyan-600 dark:bg-cyan-400 hover:bg-cyan-500 dark:hover:bg-cyan-300 disabled:opacity-50 text-white dark:text-slate-950 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Synthesizing Structured Plan...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    {autoPilotDispatch
                      ? 'Synthesize & Auto-Dispatch to Swarm'
                      : 'Synthesize Swarm Strategy'}
                  </>
                )}
              </button>
            </form>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 block">
                CALIBRATED SCENARIO PRESETS
              </span>
              {presetQueries.map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setPrompt(q)}
                  className="w-full text-left p-3 rounded-lg bg-slate-50 dark:bg-[#0B0E17] border border-slate-200 dark:border-slate-800 hover:border-cyan-500/60 text-xs text-slate-700 dark:text-slate-300 transition-colors cursor-pointer leading-relaxed"
                >
                  <span className="font-mono text-cyan-600 dark:text-cyan-400 mr-1.5">
                    0{idx + 1}.
                  </span>
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Structured Strategy & Executable Task Batch (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {error && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-mono flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <strong className="block mb-0.5">STRATEGY SYNTHESIS ERROR</strong>
                <span>{error}</span>
              </div>
            </div>
          )}

          {plan ? (
            <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
                <div>
                  <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <ShieldCheck className="w-4 h-4" />
                    STRUCTURED STRATEGY READY FOR EXECUTION
                  </span>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                    03. Synthesized Sovereign Execution Plan
                  </h2>
                </div>

                <button
                  onClick={handleDispatchBatch}
                  disabled={dispatchingAll}
                  className="px-4 py-2 text-xs font-semibold text-white dark:text-slate-950 bg-cyan-600 dark:bg-cyan-400 hover:bg-cyan-500 dark:hover:bg-cyan-300 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5" />
                  {dispatchingAll
                    ? 'Dispatching Batch...'
                    : `Dispatch All (${plan.recommendedTasks.length}) Tasks to Swarm`}
                </button>
              </div>

              {dispatchedCount !== null && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-mono flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    Auto-Pilot enqueued {dispatchedCount} task(s) into SovereignScheduler and committed proofs to Merkle Audit Spine.
                  </span>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 block mb-1">
                    EXECUTIVE ARCHITECTURAL ASSESSMENT
                  </span>
                  <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed bg-slate-50 dark:bg-[#0B0E17] p-4 rounded-lg border border-slate-200 dark:border-slate-800">
                    {plan.executiveAssessment}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-[#0B0E17] border border-slate-200 dark:border-slate-800">
                    <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 block mb-1">
                      QUANTUM &amp; PBFT THREAT POSTURE
                    </span>
                    <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed">
                      {plan.threatPosture}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-[#0B0E17] border border-slate-200 dark:border-slate-800">
                    <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 block mb-1">
                      FORMAL SMT INVARIANT SPECIFICATION
                    </span>
                    <code className="text-xs font-mono text-cyan-600 dark:text-cyan-400 break-all">
                      {plan.invariantEquation}
                    </code>
                  </div>
                </div>

                {/* Recommended Parliament Tasks */}
                <div className="space-y-3 pt-2">
                  <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 block">
                    RECOMMENDED PARLIAMENT AGENT DIRECTIVES ({plan.recommendedTasks.length})
                  </span>
                  <div className="space-y-2.5">
                    {plan.recommendedTasks.map((task, i) => (
                      <div
                        key={i}
                        className="p-4 rounded-lg bg-slate-50 dark:bg-[#0B0E17] border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-xs font-mono">
                            <span className="text-cyan-600 dark:text-cyan-400 font-semibold">
                              {task.assignedAgent}
                            </span>
                            <span>·</span>
                            <span className="text-slate-600 dark:text-slate-300">
                              {task.namespace}
                            </span>
                            <span>·</span>
                            <span className="text-slate-500 tabular-nums">
                              Priority {task.priority}
                            </span>
                          </div>
                          <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed">
                            {task.directive}
                          </p>
                        </div>

                        <button
                          onClick={() => handleDispatchSingle(task)}
                          className="px-3 py-1.5 text-xs font-medium text-slate-900 dark:text-white bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-cyan-500 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer self-start sm:self-center"
                        >
                          Dispatch Task
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center space-y-3">
              <div className="text-xs font-mono text-cyan-600 dark:text-cyan-400">
                READY FOR AUTONOMOUS ARCHITECTURAL SYNTHESIS
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                Click <strong>Synthesize &amp; Auto-Dispatch to Swarm</strong> to query <code className="font-mono text-xs">gemini-3.8-flash</code> and automatically route all generated tasks into the SovereignScheduler.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
