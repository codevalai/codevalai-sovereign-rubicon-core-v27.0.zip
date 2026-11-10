import React, { useState, useEffect } from 'react';
import { RefreshCw, Radio, Zap } from 'lucide-react';

interface TimeSeriesPoint {
  timestamp: number;
  tasksCommitted: number;
  auditLeaves: number;
  avgExecutionUs: number;
  sseJitterUs: number;
  polyNoiseSigma: number;
  anomalyTriggered: boolean;
  entropyBits: number;
}

interface FabricEvent {
  eventId: string;
  topic: string;
  data: any;
  leaf?: {
    index: number;
    timestamp: number;
    hash: string;
  };
}

export const DiagnosticsView: React.FC = () => {
  const [diag, setDiag] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [liveEvents, setLiveEvents] = useState<FabricEvent[]>([]);
  const [sseConnected, setSseConnected] = useState(false);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [triggeringAnomaly, setTriggeringAnomaly] = useState(false);

  const fetchDiagnostics = async () => {
    try {
      const res = await fetch('/api/diagnostics');
      const data = await res.json();
      setDiag(data);
    } catch (err) {
      console.error('Failed to fetch diagnostics', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiagnostics();
    const interval = setInterval(fetchDiagnostics, 3500);

    const evtSource = new EventSource('/api/events/stream');
    evtSource.onopen = () => setSseConnected(true);
    evtSource.onerror = () => setSseConnected(false);
    evtSource.onmessage = (e) => {
      try {
        const parsed = JSON.parse(e.data);
        if (parsed.type === 'connected') {
          setSseConnected(true);
        } else if (parsed.type === 'fabric_event') {
          setLiveEvents((prev) => [parsed, ...prev.slice(0, 29)]);
          fetchDiagnostics();
        }
      } catch {
        // Ignore malformed SSE frame
      }
    };

    return () => {
      clearInterval(interval);
      evtSource.close();
    };
  }, []);

  const handleSimulateLatencyAnomaly = async () => {
    setTriggeringAnomaly(true);
    try {
      await fetch('/api/swarm/inject-fault', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodeId: 'agent-velocity', targetRigor: 74 }),
      });
      await fetch('/api/watchdog/evaluate', { method: 'POST' });
      await fetchDiagnostics();
    } catch (err) {
      console.error('Failed to trigger anomaly correlation', err);
    } finally {
      setTriggeringAnomaly(false);
    }
  };

  const renderCrossSubsystemChart = () => {
    const series: TimeSeriesPoint[] = diag?.timeSeries || [];
    if (series.length < 2) {
      return (
        <div className="h-56 flex items-center justify-center text-xs font-mono text-slate-500">
          Collecting time-series telemetry points...
        </div>
      );
    }

    const width = 680;
    const height = 210;
    const padX = 36;
    const padY = 24;
    const plotW = width - padX * 2;
    const plotH = height - padY * 2;

    const maxExecUs = Math.max(...series.map((p) => p.avgExecutionUs), 260);
    const maxJitterUs = Math.max(...series.map((p) => p.sseJitterUs || 25), 220);

    const getX = (i: number) => padX + (i / (series.length - 1)) * plotW;
    const getYExec = (val: number) => padY + plotH - (val / maxExecUs) * plotH;
    const getYJitter = (val: number) => padY + plotH - (val / maxJitterUs) * plotH;

    const execPoints = series
      .map((p, i) => `${getX(i).toFixed(1)},${getYExec(p.avgExecutionUs).toFixed(1)}`)
      .join(' ');
    const jitterPoints = series
      .map((p, i) => `${getX(i).toFixed(1)},${getYJitter(p.sseJitterUs || 18).toFixed(1)}`)
      .join(' ');

    const activePoint =
      hoverIdx !== null && series[hoverIdx] ? series[hoverIdx] : series[series.length - 1];

    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
          <div className="flex items-center gap-4">
            <span className="text-cyan-600 dark:text-cyan-400">
              ─── KERNEL EXECUTION LATENCY (μs)
            </span>
            <span className="text-amber-600 dark:text-amber-400">
              - - - SSE PACKET JITTER (μs) &amp; NOISE σ
            </span>
          </div>
          {activePoint && (
            <div className="text-slate-600 dark:text-slate-300 tabular-nums">
              T={new Date(activePoint.timestamp).toLocaleTimeString()} · Exec:{' '}
              <strong>{activePoint.avgExecutionUs} μs</strong> · Jitter:{' '}
              <strong>{activePoint.sseJitterUs ?? 18} μs</strong> · σ={activePoint.polyNoiseSigma ?? 1.42}
              {activePoint.anomalyTriggered && (
                <span className="text-rose-500 ml-2 font-bold">▲ ANOMALY CORRELATED</span>
              )}
            </div>
          )}
        </div>

        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-56 bg-slate-50 dark:bg-[#0B0E17] rounded-lg border border-slate-200 dark:border-slate-800 cursor-crosshair select-none"
          onMouseLeave={() => setHoverIdx(null)}
        >
          {[0.25, 0.5, 0.75].map((ratio, idx) => {
            const y = padY + plotH * ratio;
            return (
              <line
                key={idx}
                x1={padX}
                y1={y}
                x2={width - padX}
                y2={y}
                className="stroke-slate-200 dark:stroke-slate-800"
                strokeDasharray="3 3"
                strokeWidth="1"
              />
            );
          })}

          {/* Dashed Curve: SSE Jitter & Polynomial Error Spike */}
          <polyline
            fill="none"
            points={jitterPoints}
            className="stroke-amber-500"
            strokeWidth="2"
            strokeDasharray="5 4"
          />

          {/* Solid Curve: Kernel Execution Latency */}
          <polyline
            fill="none"
            points={execPoints}
            className="stroke-cyan-600 dark:stroke-cyan-400"
            strokeWidth="2.2"
          />

          {/* Interactive Crosshair Nodes & Anomaly Markers */}
          {series.map((pt, i) => {
            const cx = getX(i);
            const cy = getYExec(pt.avgExecutionUs);
            const isHovered = hoverIdx === i;
            return (
              <g key={i} onMouseEnter={() => setHoverIdx(i)}>
                {isHovered && (
                  <line
                    x1={cx}
                    y1={padY}
                    x2={cx}
                    y2={height - padY}
                    className="stroke-cyan-500/50"
                    strokeWidth="1"
                  />
                )}
                <circle
                  cx={cx}
                  cy={cy}
                  r={pt.anomalyTriggered ? 5.5 : isHovered ? 5 : 3}
                  className={
                    pt.anomalyTriggered
                      ? 'fill-rose-500 stroke-white stroke-1'
                      : 'fill-cyan-600 dark:fill-cyan-400'
                  }
                />
                <rect
                  x={cx - plotW / series.length / 2}
                  y={padY}
                  width={plotW / series.length}
                  height={plotH}
                  fill="transparent"
                />
              </g>
            );
          })}
        </svg>
      </div>
    );
  };

  return (
    <div className="space-y-8 p-6 lg:p-8 max-w-[1440px] mx-auto">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <div className="text-xs font-mono text-cyan-600 dark:text-cyan-400 mb-1">
            05. Cross-Subsystem Latency Correlation &amp; Live Event Fabric
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            System Telemetry &amp; Anomaly Correlator
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
            Correlates lattice polynomial error distribution spikes ($\sigma$) directly against SSE packet jitter and execution latency, backed by automatic circuit-breaker rollback on SMT failure.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <span
            className={`text-xs font-mono px-3 py-2 rounded-lg border ${
              sseConnected
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
            }`}
          >
            {sseConnected ? '● SSE STREAM CONNECTED' : '▲ RECONNECTING STREAM'}
          </span>

          <button
            onClick={handleSimulateLatencyAnomaly}
            disabled={triggeringAnomaly}
            className="px-3.5 py-2 text-xs font-semibold text-amber-600 dark:text-amber-400 border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5" />
            {triggeringAnomaly ? 'Correlating Spike...' : 'Inject Error Spike & Auto-Rollback'}
          </button>

          <button
            onClick={fetchDiagnostics}
            className="px-4 py-2 text-xs font-semibold text-white dark:text-slate-950 bg-cyan-600 dark:bg-cyan-400 hover:bg-cyan-500 dark:hover:bg-cyan-300 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Sample Snapshot
          </button>
        </div>
      </div>

      {/* 4-Column Scientific Metric Display Specification */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <span className="text-xs tracking-wider uppercase font-mono text-slate-500 dark:text-slate-400 block">
            PBFT QUORUM &amp; SMT STATE
          </span>
          <div className="mt-2 flex items-baseline">
            <span className="text-2xl font-mono font-bold text-emerald-600 dark:text-emerald-400">
              ● {diag?.status || 'NOMINAL'}
            </span>
          </div>
          <span className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-1 block tabular-nums">
            Quorum: {diag?.quorumCount || '5/5'} · Uptime: {Math.round((diag?.uptimeMs ?? 12000) / 1000)} s
          </span>
        </div>

        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <span className="text-xs tracking-wider uppercase font-mono text-slate-500 dark:text-slate-400 block">
            HYBRID KEM &amp; HMAC EPOCH
          </span>
          <div className="mt-2 flex items-baseline">
            <span className="text-2xl font-mono font-bold text-slate-900 dark:text-white tabular-nums">
              Epoch #{diag?.rotationEpoch ?? 1}
            </span>
            <span className="text-xs uppercase font-mono text-slate-400 ml-1.5">
              / HMAC #{diag?.hmacEpoch ?? 1}
            </span>
          </div>
          <span className="text-xs font-mono text-cyan-600 dark:text-cyan-400 mt-1 block">
            {diag?.hybridAlgorithm || 'X25519+ML-KEM-768'}
          </span>
        </div>

        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <span className="text-xs tracking-wider uppercase font-mono text-slate-500 dark:text-slate-400 block">
            WATCHDOG CIRCUIT BREAKER
          </span>
          <div className="mt-2 flex items-baseline">
            <span className="text-2xl font-mono font-bold text-slate-900 dark:text-white tabular-nums">
              {diag?.watchdog?.incidentCount ?? 0}
            </span>
            <span className="text-xs uppercase font-mono text-slate-400 ml-1.5">
              AUTO-ROLLBACKS
            </span>
          </div>
          <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 mt-1 block tabular-nums">
            Polls: {diag?.watchdog?.evaluationCycles ?? 0} · Min Rigor {diag?.watchdog?.policy?.minCryptoRigorThreshold ?? 90}%
          </span>
        </div>

        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <span className="text-xs tracking-wider uppercase font-mono text-slate-500 dark:text-slate-400 block">
            MERKLE SPINE LEAVES
          </span>
          <div className="mt-2 flex items-baseline">
            <span className="text-2xl font-mono font-bold text-slate-900 dark:text-white tabular-nums">
              {diag?.auditLogCount ?? 0}
            </span>
            <span className="text-xs uppercase font-mono text-slate-400 ml-1.5">
              SIGNED LEAVES
            </span>
          </div>
          <span className="text-xs font-mono text-cyan-600 dark:text-cyan-400 mt-1 block tabular-nums">
            Tree Depth: {diag?.merkleTreeDepth ?? 1} Levels
          </span>
        </div>
      </div>

      {/* Main Split: Cross-Subsystem Latency Correlation Curve (7 cols) + Real-Time SSE Event Fabric Monitor (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-7 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-6 flex flex-col justify-between space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              01. Cross-Subsystem Latency &amp; Polynomial Error Correlation
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Maps kernel execution latency (μs) against SSE packet jitter and polynomial error $\sigma$. Crimson nodes denote anomaly triggers auto-remediated by the circuit breaker.
            </p>
          </div>

          {renderCrossSubsystemChart()}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-200 dark:border-slate-800 text-xs font-mono">
            <div>
              <span className="text-slate-500 block text-[11px]">ACTIVE LATTICE FINGERPRINT</span>
              <span className="text-slate-800 dark:text-slate-200 truncate block">
                {diag?.latticeFingerprint || '—'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">ACTIVE MERKLE ROOT</span>
              <span className="text-cyan-600 dark:text-cyan-400 truncate block">
                {diag?.merkleRoot || '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Live SSE Event Fabric Monitor */}
        <div className="lg:col-span-5 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-6 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Radio className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                02. Live Event Fabric Bus
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Real-time Server-Sent Events emitted by SovereignEventFabric
              </p>
            </div>
            <span className="text-xs font-mono text-slate-500 tabular-nums">
              {liveEvents.length} Live Frames
            </span>
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto font-mono text-xs pr-1">
            {liveEvents.length === 0 ? (
              (diag?.auditLeaves || []).slice(0, 6).map((leaf: any) => (
                <div
                  key={leaf.eventId}
                  className="p-3 rounded-lg bg-slate-50 dark:bg-[#0B0E17] border border-slate-200 dark:border-slate-800 space-y-1"
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-cyan-600 dark:text-cyan-400 font-semibold">
                      {leaf.topic}
                    </span>
                    <span className="text-slate-500 tabular-nums">
                      Leaf #{leaf.index} · {new Date(leaf.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-400 truncate">
                    {leaf.payloadSummary || leaf.hash}
                  </div>
                </div>
              ))
            ) : (
              liveEvents.map((evt, idx) => (
                <div
                  key={evt.eventId || idx}
                  className="p-3 rounded-lg bg-slate-50 dark:bg-[#0B0E17] border border-cyan-500/30 space-y-1"
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-cyan-600 dark:text-cyan-400 font-semibold">
                      {evt.topic}
                    </span>
                    <span className="text-emerald-600 dark:text-emerald-400 tabular-nums">
                      LIVE · Leaf #{evt.leaf?.index}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-300 truncate">
                    {JSON.stringify(evt.data)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
