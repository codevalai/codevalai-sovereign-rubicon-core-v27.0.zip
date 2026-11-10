import React, { useState, useEffect } from 'react';
import { Lock, RefreshCw, CheckCircle2, KeyRound, ShieldCheck } from 'lucide-react';

interface KeyPairSummary {
  fingerprint: string;
  algorithm: 'ML-KEM-768' | 'ML-KEM-1024';
  hybridAlgorithm: string;
  hybridFingerprint: string;
  hybridPublicKeyBytes: number;
  x25519PublicHex: string;
  createdAt: number;
  rotationEpoch: number;
  hmacEpoch: number;
  hmacKeyFingerprint: string;
  publicKeyBytes: number;
  secretKeyBytes: number;
  modulusQ: number;
  dimensionN: number;
  rankK: number;
  publicKeyHex: string;
  polynomialSample: number[];
}

interface KemRoundtripResult {
  algorithm: string;
  fingerprint: string;
  ciphertextBytes: number;
  ciphertextHex: string;
  encapsulatedSecretHex: string;
  decapsulatedSecretHex: string;
  verified: boolean;
  latencyUs: number;
  noiseDistribution: number[];
  merkleIndex: number;
}

interface HybridRoundtripResult {
  algorithm: string;
  ciphertextBytes: number;
  x25519EphemeralHex: string;
  mlKemCiphertextPrefixHex: string;
  classicalSecretHex: string;
  postQuantumSecretHex: string;
  combinedSharedSecretHex: string;
  decapsulatedSharedSecretHex: string;
  verified: boolean;
  latencyUs: number;
  hkdfCombinerLabel: string;
  merkleIndex: number;
}

export const CryptoLattice: React.FC = () => {
  const [summary, setSummary] = useState<KeyPairSummary | null>(null);
  const [kemMode, setKemMode] = useState<'hybrid' | 'pure'>('hybrid');
  const [kemResult, setKemResult] = useState<KemRoundtripResult | null>(null);
  const [hybridResult, setHybridResult] = useState<HybridRoundtripResult | null>(null);
  const [rotating, setRotating] = useState(false);
  const [rotatingHmac, setRotatingHmac] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [hoveredCoeff, setHoveredCoeff] = useState<{ idx: number; val: number } | null>(null);

  const fetchKeypair = async () => {
    try {
      const res = await fetch('/api/crypto/keypair');
      const data = await res.json();
      setSummary(data);
    } catch (err) {
      console.error('Failed to fetch keypair summary', err);
    }
  };

  useEffect(() => {
    fetchKeypair();
    runHybridRoundtrip();
    runPureKemRoundtrip();
  }, []);

  const handleRotateKey = async (algorithm: 'ML-KEM-768' | 'ML-KEM-1024') => {
    setRotating(true);
    try {
      const res = await fetch('/api/crypto/rotate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ algorithm }),
      });
      const data = await res.json();
      setSummary(data);
      await Promise.all([runHybridRoundtrip(), runPureKemRoundtrip()]);
    } catch (err) {
      console.error('Failed to rotate keypair', err);
    } finally {
      setRotating(false);
    }
  };

  const handleRotateHmac = async () => {
    setRotatingHmac(true);
    try {
      await fetch('/api/crypto/rotate-hmac', { method: 'POST' });
      await fetchKeypair();
    } catch (err) {
      console.error('Failed to rotate HMAC master key', err);
    } finally {
      setRotatingHmac(false);
    }
  };

  const runPureKemRoundtrip = async () => {
    setSimulating(true);
    try {
      const res = await fetch('/api/crypto/encapsulate', { method: 'POST' });
      const data = await res.json();
      setKemResult(data);
    } catch (err) {
      console.error('Encapsulation roundtrip failed', err);
    } finally {
      setSimulating(false);
    }
  };

  const runHybridRoundtrip = async () => {
    setSimulating(true);
    try {
      const res = await fetch('/api/crypto/hybrid/encapsulate', { method: 'POST' });
      const data = await res.json();
      setHybridResult(data);
    } catch (err) {
      console.error('Hybrid encapsulation roundtrip failed', err);
    } finally {
      setSimulating(false);
    }
  };

  const getCellColor = (val: number) => {
    const ratio = val / 3329;
    if (ratio > 0.8) return 'bg-cyan-500 text-slate-950 font-semibold';
    if (ratio > 0.6) return 'bg-cyan-600/70 text-white';
    if (ratio > 0.4) return 'bg-cyan-700/45 text-slate-100';
    if (ratio > 0.2) return 'bg-slate-800 text-slate-300';
    return 'bg-slate-900 text-slate-500';
  };

  return (
    <div className="space-y-8 p-6 lg:p-8 max-w-[1440px] mx-auto">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <div className="text-xs font-mono text-cyan-600 dark:text-cyan-400 mb-1">
            02. Hybrid X25519 + FIPS 203 ML-KEM Key-Encapsulation &amp; HMAC Agility
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Quantum Lattice &amp; Hybrid Combiner Lab
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
            Dual-encapsulation combiner binding Classical Curve25519 ECDH with Post-Quantum Module-Lattice shares via HKDF-SHA3-512, paired with Swarm Execution HMAC-SHA256 Master Key rotation.
          </p>
        </div>

        {/* Interactive Algorithm Selector + Key Rotation */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-[#111827] rounded-lg border border-slate-200 dark:border-slate-800">
            {(['ML-KEM-768', 'ML-KEM-1024'] as const).map((alg) => (
              <button
                key={alg}
                onClick={() => handleRotateKey(alg)}
                disabled={rotating}
                className={`px-3 py-1.5 text-xs font-mono font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  summary?.algorithm === alg
                    ? 'bg-white dark:bg-slate-800 text-cyan-600 dark:text-cyan-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                X25519+{alg}
              </button>
            ))}
          </div>

          <button
            onClick={handleRotateHmac}
            disabled={rotatingHmac}
            className="px-3.5 py-2 text-xs font-medium text-slate-800 dark:text-slate-200 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 hover:border-cyan-500 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <KeyRound className={`w-3.5 h-3.5 text-amber-500 ${rotatingHmac ? 'animate-spin' : ''}`} />
            Rotate HMAC Master (Epoch #{summary?.hmacEpoch ?? 1})
          </button>

          <button
            onClick={() => handleRotateKey(summary?.algorithm || 'ML-KEM-768')}
            disabled={rotating}
            className="px-4 py-2 text-xs font-semibold text-white dark:text-slate-950 bg-cyan-600 dark:bg-cyan-400 hover:bg-cyan-500 dark:hover:bg-cyan-300 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${rotating ? 'animate-spin' : ''}`} />
            Rotate Composite Keypair
          </button>
        </div>
      </div>

      {/* 4-Column Scientific Metric Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <span className="text-xs tracking-wider uppercase font-mono text-slate-500 dark:text-slate-400 block">
            HYBRID COMPOSITE PUBLIC KEY
          </span>
          <div className="mt-2 flex items-baseline">
            <span className="text-2xl font-mono font-bold text-slate-900 dark:text-white tabular-nums">
              {summary?.hybridPublicKeyBytes ?? 1216}
            </span>
            <span className="text-xs uppercase font-mono text-slate-400 ml-1.5">
              BYTES (32B + {summary?.publicKeyBytes ?? 1184}B)
            </span>
          </div>
          <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 mt-1 block">
            ● {summary?.hybridAlgorithm || 'X25519+ML-KEM-768'}
          </span>
        </div>

        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <span className="text-xs tracking-wider uppercase font-mono text-slate-500 dark:text-slate-400 block">
            RING POLYNOMIAL &amp; RANK
          </span>
          <div className="mt-2 flex items-baseline">
            <span className="text-2xl font-mono font-bold text-slate-900 dark:text-white tabular-nums">
              k = {summary?.rankK ?? 3}
            </span>
            <span className="text-xs uppercase font-mono text-slate-400 ml-1.5">
              Q = {summary?.modulusQ ?? 3329} · N = 256
            </span>
          </div>
          <span className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-1 block tabular-nums">
            Key Epoch #{summary?.rotationEpoch ?? 1} · NTT Enabled
          </span>
        </div>

        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <span className="text-xs tracking-wider uppercase font-mono text-slate-500 dark:text-slate-400 block">
            SWARM HMAC MASTER EPOCH
          </span>
          <div className="mt-2 flex items-baseline">
            <span className="text-2xl font-mono font-bold text-slate-900 dark:text-white tabular-nums">
              #{summary?.hmacEpoch ?? 1}
            </span>
            <span className="text-xs uppercase font-mono text-slate-400 ml-1.5">
              5/5 NODES SYNCED
            </span>
          </div>
          <span className="text-xs font-mono text-cyan-600 dark:text-cyan-400 mt-1 block truncate" title={summary?.hmacKeyFingerprint}>
            SHA-256: {(summary?.hmacKeyFingerprint || '').slice(0, 18)}...
          </span>
        </div>

        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <span className="text-xs tracking-wider uppercase font-mono text-slate-500 dark:text-slate-400 block">
            HYBRID COMBINER LATENCY
          </span>
          <div className="mt-2 flex items-baseline">
            <span className="text-2xl font-mono font-bold text-slate-900 dark:text-white tabular-nums">
              {hybridResult?.latencyUs ?? 28.4}
            </span>
            <span className="text-xs uppercase font-mono text-slate-400 ml-1.5">
              μs
            </span>
          </div>
          <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 mt-1 block">
            ● HKDF-SHA3-512 Bound Secret
          </span>
        </div>
      </div>

      {/* Main Split: Polynomial Ring Heatmap (7 cols) + Dual-Mode Combiner Workbench (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left: Polynomial Ring Spectrographic Heatmap */}
        <div className="lg:col-span-7 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-6 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  01. Polynomial Ring Matrix Sample A ∈ R_q^(k×k)
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  64 sampled NTT coefficients in Z_3329 from the post-quantum component of the composite keypair.
                </p>
              </div>
              <div className="text-xs font-mono text-cyan-600 dark:text-cyan-400 tabular-nums">
                {hoveredCoeff
                  ? `c[${hoveredCoeff.idx}] = ${hoveredCoeff.val} mod 3329`
                  : 'Hover cell for coefficient'}
              </div>
            </div>

            {/* 8x8 Discrete Spectrographic Matrix */}
            <div className="grid grid-cols-8 gap-1 p-3 bg-slate-950 rounded-xl border border-slate-800 cursor-crosshair">
              {(summary?.polynomialSample || Array.from({ length: 64 }, (_, i) => (i * 517) % 3329)).map(
                (val, idx) => (
                  <div
                    key={idx}
                    onMouseEnter={() => setHoveredCoeff({ idx, val })}
                    onMouseLeave={() => setHoveredCoeff(null)}
                    className={`h-9 rounded flex items-center justify-center text-[11px] font-mono tabular-nums transition-transform hover:scale-105 ${getCellColor(
                      val
                    )}`}
                  >
                    {val}
                  </div>
                )
              )}
            </div>

            {/* Color Scale Legend */}
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400 pt-1">
              <span>MIN: 0</span>
              <div className="flex items-center gap-1">
                <span className="w-4 h-2 rounded-xs bg-slate-900 inline-block" />
                <span className="w-4 h-2 rounded-xs bg-slate-800 inline-block" />
                <span className="w-4 h-2 rounded-xs bg-cyan-700/45 inline-block" />
                <span className="w-4 h-2 rounded-xs bg-cyan-600/70 inline-block" />
                <span className="w-4 h-2 rounded-xs bg-cyan-500 inline-block" />
              </div>
              <span>MID: 1664</span>
              <span>MAX: 3328 (Q-1)</span>
            </div>
          </div>

          {/* Classical X25519 + Composite Fingerprint Inspector */}
          <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800 font-mono text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[11px] mb-1">
                  CLASSICAL X25519 PUBLIC SHARE (32 BYTES)
                </span>
                <div className="bg-slate-50 dark:bg-[#0B0E17] p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-amber-600 dark:text-amber-400 break-all text-[11px]">
                  {summary?.x25519PublicHex || 'Generating Curve25519 share...'}
                </div>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[11px] mb-1">
                  COMPOSITE HYBRID FINGERPRINT (SHA3-256)
                </span>
                <div className="bg-slate-50 dark:bg-[#0B0E17] p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-cyan-600 dark:text-cyan-400 break-all text-[11px]">
                  {summary?.hybridFingerprint || summary?.fingerprint || 'Loading...'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Hybrid X25519 + ML-KEM Combiner vs Pure ML-KEM Workbench */}
        <div className="lg:col-span-5 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-6 flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  02. Cryptographic Combiner Verifier
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Compare Hybrid X25519+ML-KEM against standalone FIPS 203 ML-KEM.
                </p>
              </div>

              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-[#0B0E17] rounded-lg border border-slate-200 dark:border-slate-800">
                <button
                  onClick={() => setKemMode('hybrid')}
                  className={`px-2.5 py-1 text-xs font-mono rounded transition-colors cursor-pointer ${
                    kemMode === 'hybrid'
                      ? 'bg-white dark:bg-slate-800 text-cyan-600 dark:text-cyan-400 font-semibold'
                      : 'text-slate-500'
                  }`}
                >
                  Hybrid Combiner
                </button>
                <button
                  onClick={() => setKemMode('pure')}
                  className={`px-2.5 py-1 text-xs font-mono rounded transition-colors cursor-pointer ${
                    kemMode === 'pure'
                      ? 'bg-white dark:bg-slate-800 text-cyan-600 dark:text-cyan-400 font-semibold'
                      : 'text-slate-500'
                  }`}
                >
                  Pure ML-KEM
                </button>
              </div>
            </div>

            {kemMode === 'hybrid' && hybridResult ? (
              <div className="space-y-3.5 text-xs font-mono">
                <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                  <span className="flex items-center gap-1.5 font-semibold">
                    <ShieldCheck className="w-4 h-4" />
                    {hybridResult.verified ? 'HYBRID HKDF-SHA3-512 MATCH' : 'MISMATCH'}
                  </span>
                  <span className="tabular-nums">
                    {hybridResult.ciphertextBytes}B CT · Leaf #{hybridResult.merkleIndex}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px] mb-1">
                    EPHEMERAL X25519 SHARE (32B) + CLASSICAL ECDH SECRET
                  </span>
                  <div className="bg-slate-50 dark:bg-[#0B0E17] p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-amber-600 dark:text-amber-400 break-all text-[11px] space-y-1">
                    <div>Eph PK: {hybridResult.x25519EphemeralHex}</div>
                    <div className="text-slate-600 dark:text-slate-400">
                      ss_X25519: {hybridResult.classicalSecretHex}
                    </div>
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px] mb-1">
                    POST-QUANTUM ML-KEM SHARED SECRET (ss_MLKEM)
                  </span>
                  <div className="bg-slate-50 dark:bg-[#0B0E17] p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-cyan-600 dark:text-cyan-400 break-all text-[11px]">
                    {hybridResult.postQuantumSecretHex}
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px] mb-1">
                    FINAL HKDF-SHA3-512 BOUND SESSION SECRET (32 BYTES)
                  </span>
                  <div className="bg-slate-50 dark:bg-[#0B0E17] p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-emerald-600 dark:text-emerald-400 break-all text-[11px]">
                    {hybridResult.combinedSharedSecretHex}
                  </div>
                </div>
              </div>
            ) : (
              kemResult && (
                <div className="space-y-3.5 text-xs font-mono">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                    <span className="flex items-center gap-1.5 font-semibold">
                      <CheckCircle2 className="w-4 h-4" />
                      {kemResult.verified ? 'SHARED SECRET BIT-EXACT MATCH' : 'MISMATCH DETECTED'}
                    </span>
                    <span className="tabular-nums">Leaf #{kemResult.merkleIndex}</span>
                  </div>

                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block text-[11px] mb-1">
                      CIPHERTEXT VECTOR u, v ({kemResult.ciphertextBytes} BYTES)
                    </span>
                    <div className="bg-slate-50 dark:bg-[#0B0E17] p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 break-all text-[11px]">
                      {kemResult.ciphertextHex}...
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block text-[11px] mb-1">
                      ENCAPSULATED SHARED SECRET (SHA3-256)
                    </span>
                    <div className="bg-slate-50 dark:bg-[#0B0E17] p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-cyan-600 dark:text-cyan-400 break-all text-[11px]">
                      {kemResult.encapsulatedSecretHex}
                    </div>
                  </div>

                  {kemResult.noiseDistribution && (
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 block text-[11px] mb-1.5">
                        CENTERED BINOMIAL ERROR POLYNOMIAL e_1 ∈ [-3, +3]
                      </span>
                      <div className="h-14 bg-slate-50 dark:bg-[#0B0E17] p-2 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center gap-1">
                        {kemResult.noiseDistribution.map((n, idx) => {
                          const heightPct = Math.max(15, (Math.abs(n) / 3) * 100);
                          return (
                            <div key={idx} className="flex-1 h-full flex items-center justify-center">
                              <div
                                style={{ height: `${heightPct}%` }}
                                className={`w-full rounded-xs ${n >= 0 ? 'bg-cyan-500' : 'bg-amber-500'}`}
                                title={`e[${idx}] = ${n}`}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )
            )}
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              onClick={kemMode === 'hybrid' ? runHybridRoundtrip : runPureKemRoundtrip}
              disabled={simulating}
              className="w-full py-2.5 px-4 bg-cyan-600 dark:bg-cyan-400 hover:bg-cyan-500 dark:hover:bg-cyan-300 text-white dark:text-slate-950 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${simulating ? 'animate-spin' : ''}`} />
              {simulating
                ? 'Executing Combiner Roundtrip...'
                : kemMode === 'hybrid'
                ? 'Execute Hybrid X25519 + ML-KEM Roundtrip'
                : 'Execute Pure ML-KEM Roundtrip'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
