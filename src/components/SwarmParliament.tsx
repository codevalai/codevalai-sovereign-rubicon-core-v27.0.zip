import React, { useState, useEffect, useMemo } from 'react';
import { RefreshCw, Search, ArrowUpRight, CheckCircle2, AlertTriangle, Clock, ShieldCheck, Zap, RotateCcw } from 'lucide-react';

export interface Agent {
  id: string;
  role: string;
  capabilities: string[];
  calibrationVector: {
    cryptographicRigor: number;
    computeVelocity: number;
    invariantStrictness: number;
    consensusWeight: number;
    zeroTrustPosture: number;
    ipPurityIndex: number;
  };
  bftState: 'NOMINAL' | 'DEGRADED' | 'SLASHED' | 'REMEDIATING';
  smtNominal: boolean;
  slashedCount: number;
  tasksCompleted: number;
  avgLatencyMs: number;
  lastActiveAt: number;
}

export interface Task {
  id: string;
  namespace: string;
  priority: number;
  payload: any;
  assignedAgent?: string;
  status: string;
  createdAt: number;
  completedAt?: number;
  durationMs?: number;
  merkleIndex?: number;
  executionProof?: string;
  hmacEpoch?: number;
  invariantResult?: {
    agent: string;
    role: string;
    smtCheck: 'SATISFIED' | 'UNSAT';
    proofHash: string;
  };
}

interface SwarmParliamentProps {
  onOpenDispatch: (defaultAgent?: string) => void;
  onInspectMerkleLeaf?: (index: number) => void;
  refreshTrigger?: number;
}

export const SwarmParliament: React.FC<SwarmParliamentProps> = ({
  onOpenDispatch,
  onInspectMerkleLeaf,
  refreshTrigger = 0,
}) => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('agent-sentinel');
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'committed' | 'failed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [injectingFault, setInjectingFault] = useState(false);

  const fetchData = async () => {
    try {
      const [agentsRes, tasksRes] = await Promise.all([
        fetch('/api/agents'),
        fetch('/api/tasks'),
      ]);
      const agentsData = await agentsRes.json();
      const tasksData = await tasksRes.json();
      setAgents(Array.isArray(agentsData) ? agentsData : []);
      setTasks(Array.isArray(tasksData) ? tasksData : []);
      if (!selectedTask && Array.isArray(tasksData) && tasksData.length > 0) {
        setSelectedTask(tasksData[0]);
      }
    } catch (err) {
      console.error('Failed to fetch swarm data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, [refreshTrigger]);

  const selectedAgent = useMemo(
    () => agents.find((a) => a.id === selectedAgentId) || agents[0],
    [agents, selectedAgentId]
  );

  const nominalQuorumCount = useMemo(
    () => agents.filter((a) => a.bftState === 'NOMINAL' && a.smtNominal).length,
    [agents]
  );

  const handleInjectFault = async (nodeId: string) => {
    setInjectingFault(true);
    try {
      await fetch('/api/swarm/inject-fault', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodeId, targetRigor: 72 }),
      });
      await fetchData();
    } catch (err) {
      console.error('Failed to inject fault', err);
    } finally {
      setInjectingFault(false);
    }
  };

  const handleSlashAndRehabilitate = async (nodeId: string) => {
    setInjectingFault(true);
    try {
      await fetch('/api/swarm/slash-rehabilitate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodeId, reason: 'OPERATOR_PBFT_QUORUM_RECALIBRATION' }),
      });
      await fetchData();
    } catch (err) {
      console.error('Failed to rehabilitate node', err);
    } finally {
      setInjectingFault(false);
    }
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (filter === 'pending' && !(t.status === 'PENDING' || t.status === 'ROUTED' || t.status === 'EXECUTING')) {
        return false;
      }
      if (filter === 'committed' && !(t.status === 'COMMITTED' || t.status === 'VERIFIED')) {
        return false;
      }
      if (filter === 'failed' && t.status !== 'FAILED') {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const directive =
          typeof t.payload?.directive === 'string'
            ? t.payload.directive.toLowerCase()
            : JSON.stringify(t.payload).toLowerCase();
        return (
          t.id.toLowerCase().includes(q) ||
          t.namespace.toLowerCase().includes(q) ||
          (t.assignedAgent || '').toLowerCase().includes(q) ||
          directive.includes(q)
        );
      }
      return true;
    });
  }, [tasks, filter, searchQuery]);

  // Radar chart helper for 6 calibration axes
  const renderRadarChart = (agent?: Agent) => {
    if (!agent) return null;
    const axes = [
      { key: 'cryptographicRigor', label: 'CRYPTO RIGOR', val: agent.calibrationVector.cryptographicRigor },
      { key: 'computeVelocity', label: 'COMPUTE VELOCITY', val: agent.calibrationVector.computeVelocity },
      { key: 'invariantStrictness', label: 'SMT INVARIANT', val: agent.calibrationVector.invariantStrictness },
      { key: 'consensusWeight', label: 'QUORUM WEIGHT', val: agent.calibrationVector.consensusWeight },
      { key: 'zeroTrustPosture', label: 'ZERO TRUST', val: agent.calibrationVector.zeroTrustPosture },
      { key: 'ipPurityIndex', label: 'IP PURITY', val: agent.calibrationVector.ipPurityIndex },
    ];

    const cx = 140;
    const cy = 125;
    const maxR = 78;

    const getPoint = (idx: number, radiusRatio: number) => {
      const angle = (Math.PI * 2 * idx) / axes.length - Math.PI / 2;
      return {
        x: cx + Math.cos(angle) * maxR * radiusRatio,
        y: cy + Math.sin(angle) * maxR * radiusRatio,
      };
    };

    const ringLevels = [0.25, 0.5, 0.75, 1.0];
    const polygonPoints = axes
      .map((axis, i) => {
        const pt = getPoint(i, axis.val / 100);
        return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
      })
      .join(' ');

    const isDegraded = !agent.smtNominal || agent.bftState !== 'NOMINAL';

    return (
      <svg viewBox="0 0 280 250" className="w-full h-56 select-none">
        {ringLevels.map((lvl, idx) => {
          const pts = axes
            .map((_, i) => {
              const p = getPoint(i, lvl);
              return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
            })
            .join(' ');
          return (
            <polygon
              key={idx}
              points={pts}
              fill="none"
              className="stroke-slate-200 dark:stroke-slate-800"
              strokeWidth="1"
            />
          );
        })}

        {axes.map((axis, i) => {
          const end = getPoint(i, 1.0);
          const labelPt = getPoint(i, 1.24);
          return (
            <g key={axis.key}>
              <line
                x1={cx}
                y1={cy}
                x2={end.x}
                y2={end.y}
                className="stroke-slate-200 dark:stroke-slate-800"
                strokeWidth="1"
              />
              <text
                x={labelPt.x}
                y={labelPt.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-slate-500 dark:fill-slate-400 text-[8px] font-mono tracking-wider"
              >
                {axis.label}
              </text>
            </g>
          );
        })}

        <polygon
          points={polygonPoints}
          className={
            isDegraded
              ? 'fill-rose-500/25 stroke-rose-600 dark:stroke-rose-400'
              : 'fill-cyan-500/20 stroke-cyan-600 dark:stroke-cyan-400'
          }
          strokeWidth="2"
        />

        {axes.map((axis, i) => {
          const pt = getPoint(i, axis.val / 100);
          return (
            <circle
              key={i}
              cx={pt.x}
              cy={pt.y}
              r="3.5"
              className={isDegraded ? 'fill-rose-600 dark:fill-rose-400' : 'fill-cyan-600 dark:fill-cyan-400'}
            />
          );
        })}
      </svg>
    );
  };

  return (
    <div className="space-y-8 p-6 lg:p-8 max-w-[1440px] mx-auto">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <div className="text-xs font-mono text-cyan-600 dark:text-cyan-400 mb-1">
            01. Autonomous Multi-Agent Execution &amp; PBFT Quorum Verification
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Parliament Swarm Console
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
            Five specialized sovereign agents operating under PBFT quorum consensus, HMAC-SHA256 execution proofs, and automated Byzantine fault slashing &amp; rehabilitation.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={fetchData}
            className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Sync Telemetry
          </button>
          <button
            onClick={() => onOpenDispatch(selectedAgent?.id)}
            className="px-4 py-2 text-xs font-semibold text-white dark:text-slate-950 bg-cyan-600 dark:bg-cyan-400 hover:bg-cyan-500 dark:hover:bg-cyan-300 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            New Directive
          </button>
        </div>
      </div>

      {/* Asymmetric Split: Left 5-Agent Roster + Right Calibration Radar & BFT Slashing Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Agent Roster (8 cols) */}
        <div className="lg:col-span-8 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              01. Active Parliament Roster
            </h2>
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400 tabular-nums">
              {agents.length} Nodes Registered · PBFT Quorum {nominalQuorumCount}/{agents.length}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
            {agents.map((agent) => {
              const isSelected = selectedAgent?.id === agent.id;
              const isHealthy = agent.bftState === 'NOMINAL' && agent.smtNominal;
              return (
                <div
                  key={agent.id}
                  onClick={() => setSelectedAgentId(agent.id)}
                  className={`p-5 rounded-xl border transition-colors cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-slate-50 dark:bg-[#111827] border-cyan-600 dark:border-cyan-400'
                      : 'bg-white dark:bg-[#0B0E17] border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between text-xs font-mono mb-2">
                      <span className="text-cyan-600 dark:text-cyan-400 font-semibold">
                        {agent.id}
                      </span>
                      {isHealthy ? (
                        <span className="text-emerald-600 dark:text-emerald-400">
                          ● Nominal (Rigor {agent.calibrationVector.cryptographicRigor}%)
                        </span>
                      ) : (
                        <span className="text-rose-600 dark:text-rose-400 font-semibold">
                          ▲ {agent.bftState} (Rigor {agent.calibrationVector.cryptographicRigor}%)
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {agent.role}
                    </h3>

                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400 font-mono mt-2">
                      {agent.capabilities.map((cap, idx) => (
                        <React.Fragment key={cap}>
                          <span>{cap}</span>
                          {idx < agent.capabilities.length - 1 && (
                            <span aria-hidden="true">·</span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-200/70 dark:border-slate-800/80 flex items-center justify-between text-xs font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                    <span>
                      Committed: <strong className="text-slate-900 dark:text-slate-200">{agent.tasksCompleted}</strong>
                    </span>
                    <span>·</span>
                    <span>
                      Slashed: <strong className="text-slate-900 dark:text-slate-200">{agent.slashedCount}</strong>
                    </span>
                    <span>·</span>
                    <span>
                      Latency: <strong className="text-slate-900 dark:text-slate-200">{agent.avgLatencyMs} ms</strong>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Agent Calibration Spider/Radar & PBFT Slashing Controls (4 cols) */}
        <div className="lg:col-span-4 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 mb-4">
              <div>
                <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
                  NODE CALIBRATION &amp; PBFT STATE
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                  {selectedAgent ? selectedAgent.role : 'Select Node'}
                </h3>
              </div>
              <span className="text-xs font-mono text-cyan-600 dark:text-cyan-400">
                {selectedAgent?.id}
              </span>
            </div>

            {renderRadarChart(selectedAgent)}

            {selectedAgent && (
              <div className="grid grid-cols-2 gap-3 mt-2 pt-3 border-t border-slate-200 dark:border-slate-800 text-xs font-mono tabular-nums">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px]">CRYPTO RIGOR</span>
                  <span
                    className={`text-base font-bold ${
                      selectedAgent.calibrationVector.cryptographicRigor < 90
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-slate-900 dark:text-white'
                    }`}
                  >
                    {selectedAgent.calibrationVector.cryptographicRigor}
                    <span className="text-xs text-slate-400 ml-1">%</span>
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px]">SMT INVARIANT</span>
                  <span
                    className={`text-base font-bold ${
                      selectedAgent.smtNominal
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {selectedAgent.smtNominal ? 'SATISFIED' : 'UNSAT'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px]">QUORUM WEIGHT</span>
                  <span className="text-base font-bold text-slate-900 dark:text-white">
                    {selectedAgent.calibrationVector.consensusWeight}
                    <span className="text-xs text-slate-400 ml-1">%</span>
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px]">BFT SLASH COUNT</span>
                  <span className="text-base font-bold text-slate-900 dark:text-white">
                    {selectedAgent.slashedCount}
                  </span>
                </div>
              </div>
            )}
          </div>

          {selectedAgent && (
            <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleInjectFault(selectedAgent.id)}
                  disabled={injectingFault}
                  className="py-2 px-3 text-xs font-medium text-amber-600 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/10 rounded-lg transition-colors flex items-center justify-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
                  title="Simulate SMT Invariant Failure & Crypto Rigor Drop (<90%)"
                >
                  <Zap className="w-3.5 h-3.5" />
                  Simulate Skew
                </button>
                <button
                  onClick={() => handleSlashAndRehabilitate(selectedAgent.id)}
                  disabled={injectingFault}
                  className="py-2 px-3 text-xs font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/10 rounded-lg transition-colors flex items-center justify-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
                  title="Execute PBFT Slashing & Restore Nominal Rigor"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Recalibrate Node
                </button>
              </div>
              <button
                onClick={() => onOpenDispatch(selectedAgent.id)}
                className="w-full py-2 px-4 text-xs font-semibold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 hover:bg-cyan-600 hover:text-white dark:hover:bg-cyan-400 dark:hover:text-slate-950 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Route Task to {selectedAgent.id}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Task Execution Ledger & Proof Inspector */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              02. Deterministic Task Execution Ledger
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Click any task row to inspect its HMAC-SHA256 execution proof, HMAC epoch, and SMT invariant status.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter namespace, ID, or directive..."
                className="pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 w-60"
              />
            </div>

            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-[#111827] rounded-lg border border-slate-200 dark:border-slate-800">
              {(['all', 'pending', 'committed', 'failed'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setFilter(tab)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer capitalize ${
                    filter === tab
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* High-Density Task Table (8 cols) */}
          <div className="lg:col-span-8 bg-white dark:bg-[#0B0E17] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            {loading ? (
              <div className="p-10 text-center text-xs font-mono text-slate-500">
                Synchronizing sovereign task registry...
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  No matching tasks in the execution ledger.
                </p>
                <button
                  onClick={() => onOpenDispatch()}
                  className="px-4 py-2 text-xs font-semibold text-white dark:text-slate-950 bg-cyan-600 dark:bg-cyan-400 rounded-lg cursor-pointer"
                >
                  Dispatch First Task
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#111827] text-[11px] font-mono text-slate-500 dark:text-slate-400">
                      <th className="py-2.5 px-4">TASK ID</th>
                      <th className="py-2.5 px-4">NAMESPACE</th>
                      <th className="py-2.5 px-4">AGENT</th>
                      <th className="py-2.5 px-4 text-right">PRIORITY</th>
                      <th className="py-2.5 px-4">STATE</th>
                      <th className="py-2.5 px-4 text-right">MERKLE LEAF</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/80 text-xs font-mono">
                    {filteredTasks.map((t) => {
                      const isRowSelected = selectedTask?.id === t.id;
                      return (
                        <tr
                          key={t.id}
                          onClick={() => setSelectedTask(t)}
                          className={`transition-colors cursor-pointer ${
                            isRowSelected
                              ? 'bg-cyan-50/60 dark:bg-cyan-950/25'
                              : 'hover:bg-slate-50 dark:hover:bg-[#111827]/60'
                          }`}
                        >
                          <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                            {t.id}
                          </td>
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                            {t.namespace}
                          </td>
                          <td className="py-3 px-4 text-cyan-600 dark:text-cyan-400 whitespace-nowrap">
                            {t.assignedAgent || 'agent-nexus'}
                          </td>
                          <td className="py-3 px-4 text-right tabular-nums text-slate-700 dark:text-slate-300">
                            {t.priority}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            {t.status === 'COMMITTED' && (
                              <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> COMMITTED
                              </span>
                            )}
                            {t.status === 'FAILED' && (
                              <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1">
                                <AlertTriangle className="w-3.5 h-3.5" /> FAILED
                              </span>
                            )}
                            {t.status !== 'COMMITTED' && t.status !== 'FAILED' && (
                              <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" /> {t.status}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right tabular-nums">
                            {t.merkleIndex !== undefined ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onInspectMerkleLeaf?.(t.merkleIndex!);
                                }}
                                className="text-cyan-600 dark:text-cyan-400 hover:underline inline-flex items-center gap-0.5 cursor-pointer"
                              >
                                #{t.merkleIndex}
                                <ArrowUpRight className="w-3 h-3" />
                              </button>
                            ) : (
                              <span className="text-slate-400">—</span>
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

          {/* Cryptographic Task Proof Inspector (4 cols) */}
          <div className="lg:col-span-4 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col justify-between">
            {selectedTask ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                  <div>
                    <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 block">
                      EXECUTION PROOF INSPECTOR
                    </span>
                    <h3 className="text-sm font-mono font-bold text-slate-900 dark:text-white mt-0.5">
                      {selectedTask.id}
                    </h3>
                  </div>
                  <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <ShieldCheck className="w-4 h-4" />
                    {selectedTask.invariantResult?.smtCheck || 'VERIFIED'}
                  </span>
                </div>

                <div className="space-y-3 text-xs font-mono">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block text-[11px]">DIRECTIVE PAYLOAD</span>
                    <p className="text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-[#0B0E17] p-3 rounded-lg border border-slate-200 dark:border-slate-800 mt-1 font-sans text-xs leading-relaxed">
                      {selectedTask.payload?.directive || JSON.stringify(selectedTask.payload)}
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-2 tabular-nums">
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 block text-[10px]">EXECUTOR</span>
                      <span className="text-slate-900 dark:text-white font-semibold">
                        {selectedTask.assignedAgent || 'agent-nexus'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 block text-[10px]">HMAC EPOCH</span>
                      <span className="text-cyan-600 dark:text-cyan-400 font-semibold">
                        #{selectedTask.hmacEpoch ?? 1}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 block text-[10px]">DURATION</span>
                      <span className="text-slate-900 dark:text-white font-semibold">
                        {selectedTask.durationMs ?? 8} ms
                      </span>
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block text-[11px]">
                      HMAC-SHA256 EXECUTION PROOF DIGEST
                    </span>
                    <div className="bg-slate-50 dark:bg-[#0B0E17] p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-cyan-700 dark:text-cyan-300 break-all mt-1 text-[11px]">
                      {selectedTask.executionProof || 'Pending execution commitment...'}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-xs font-mono text-slate-500 py-12 text-center">
                Select a task from the ledger to inspect its cryptographic execution proof.
              </div>
            )}

            {selectedTask?.merkleIndex !== undefined && onInspectMerkleLeaf && (
              <div className="mt-5 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  onClick={() => onInspectMerkleLeaf(selectedTask.merkleIndex!)}
                  className="w-full py-2 px-4 text-xs font-semibold text-cyan-600 dark:text-cyan-400 border border-cyan-600/30 dark:border-cyan-400/30 hover:bg-cyan-50 dark:hover:bg-cyan-950/30 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  Verify Merkle Inclusion Leaf #{selectedTask.merkleIndex}
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
