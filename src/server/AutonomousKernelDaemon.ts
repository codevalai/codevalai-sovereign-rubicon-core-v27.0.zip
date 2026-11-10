import { EventEmitter } from 'events';
import { SovereignKernel } from './sovereignKernel.js';

export interface WatchdogPolicyConfig {
  enabled: boolean;
  pollIntervalMs: number;
  minCryptoRigorThreshold: number;
  minComputeVelocityThreshold: number;
  autoRotateKeysOnBreach: boolean;
  autoRotateHmacOnBreach: boolean;
  autoSlashByzantineNodes: boolean;
}

export interface WatchdogIncidentRecord {
  id: string;
  timestamp: number;
  nodeId: string;
  breachReason: string;
  detectedRigor: number;
  smtStatus: 'SATISFIED' | 'UNSAT';
  actionsTaken: string[];
  merkleLeafIndex: number;
}

export class AutonomousKernelDaemon extends EventEmitter {
  private policy: WatchdogPolicyConfig = {
    enabled: true,
    pollIntervalMs: 3500,
    minCryptoRigorThreshold: 90,
    minComputeVelocityThreshold: 80,
    autoRotateKeysOnBreach: true,
    autoRotateHmacOnBreach: true,
    autoSlashByzantineNodes: true,
  };

  private timer?: NodeJS.Timeout;
  private incidents: WatchdogIncidentRecord[] = [];
  private evaluationCycles = 0;
  private lastEvaluatedAt = Date.now();

  constructor(private readonly kernel: SovereignKernel) {
    super();
  }

  public start(): void {
    if (this.timer) return;
    this.scheduleNextTick();
  }

  public stop(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
  }

  private scheduleNextTick(): void {
    this.timer = setTimeout(async () => {
      if (this.policy.enabled) {
        try {
          await this.evaluateGridState();
        } catch (err) {
          this.emit('error', err);
        }
      }
      this.scheduleNextTick();
    }, this.policy.pollIntervalMs);
  }

  public updatePolicy(partial: Partial<WatchdogPolicyConfig>): WatchdogPolicyConfig {
    this.policy = { ...this.policy, ...partial };
    this.kernel.getEventFabric().publish('watchdog.policy_updated', {
      enabled: this.policy.enabled,
      minCryptoRigorThreshold: this.policy.minCryptoRigorThreshold,
      autoRotateKeysOnBreach: this.policy.autoRotateKeysOnBreach,
    });
    return this.getPolicy();
  }

  public getPolicy(): WatchdogPolicyConfig {
    return { ...this.policy };
  }

  public getStatus() {
    return {
      policy: this.policy,
      evaluationCycles: this.evaluationCycles,
      lastEvaluatedAt: this.lastEvaluatedAt,
      incidentCount: this.incidents.length,
      recentIncidents: this.incidents.slice(0, 15),
    };
  }

  public async evaluateGridState(): Promise<WatchdogIncidentRecord[]> {
    this.evaluationCycles += 1;
    this.lastEvaluatedAt = Date.now();

    const agents = this.kernel.getAgents();
    const triggeredIncidents: WatchdogIncidentRecord[] = [];

    for (const agent of agents) {
      const rigorLow = agent.calibrationVector.cryptographicRigor < this.policy.minCryptoRigorThreshold;
      const smtFailed = !agent.smtNominal;
      const velocityLow = agent.calibrationVector.computeVelocity < this.policy.minComputeVelocityThreshold;

      if ((rigorLow || smtFailed || velocityLow) && agent.bftState !== 'REMEDIATING') {
        const breachReasons: string[] = [];
        if (smtFailed) breachReasons.push('SMT_INVARIANT_UNSAT');
        if (rigorLow) breachReasons.push(`CRYPTO_RIGOR_BELOW_${this.policy.minCryptoRigorThreshold}% (${agent.calibrationVector.cryptographicRigor}%)`);
        if (velocityLow) breachReasons.push(`COMPUTE_VELOCITY_DEGRADED (${agent.calibrationVector.computeVelocity}%)`);

        const incident = await this.triggerEmergencyRemediation(
          agent.id,
          breachReasons.join(' + '),
          agent.calibrationVector.cryptographicRigor,
          smtFailed ? 'UNSAT' : 'SATISFIED'
        );
        triggeredIncidents.push(incident);
      }
    }

    return triggeredIncidents;
  }

  public async triggerEmergencyRemediation(
    nodeId: string,
    breachReason: string,
    detectedRigor: number,
    smtStatus: 'SATISFIED' | 'UNSAT'
  ): Promise<WatchdogIncidentRecord> {
    const actionsTaken: string[] = [];

    // 1. BFT Slashing / Quarantine if configured
    if (this.policy.autoSlashByzantineNodes) {
      this.kernel.slashAndRehabilitateAgent(nodeId, breachReason);
      actionsTaken.push(`BFT_SLASH_AND_RECALIBRATE(${nodeId})`);
    }

    // 2. Force Post-Quantum + Hybrid X25519 Keypair Rotation
    if (this.policy.autoRotateKeysOnBreach) {
      await this.kernel.rotateLatticeKeys('ML-KEM-768');
      actionsTaken.push('HYBRID_X25519_MLKEM_KEY_ROTATION');
    }

    // 3. Rotate Swarm Execution Proof HMAC Master Key
    if (this.policy.autoRotateHmacOnBreach) {
      const hmacEpoch = this.kernel.rotateSwarmHmacKey();
      actionsTaken.push(`SWARM_HMAC_EPOCH_ROTATED(#${hmacEpoch.hmacEpoch})`);
    }

    // 4. Auto-Dispatch Remediation Task Directive to agent-sentinel / agent-aletheia
    const remTask = this.kernel.dispatchTask(
      {
        directive: `[AUTONOMOUS CIRCUIT BREAKER] Remediate ${nodeId} (${breachReason}) — verify new Hybrid X25519+ML-KEM-768 key share and restore SMT invariant satisfaction.`,
        source: 'AutonomousKernelDaemon',
      },
      'watchdog.circuit_breaker.remediate',
      99,
      'agent-aletheia'
    );
    actionsTaken.push(`DISPATCHED_REMEDIATION_TASK(${remTask.id})`);

    const leaf = this.kernel.getEventFabric().publish('watchdog.circuit_breaker_tripped', {
      nodeId,
      breachReason,
      actionsTaken,
    });

    const record: WatchdogIncidentRecord = {
      id: `INC-${Date.now().toString(36).toUpperCase()}`,
      timestamp: Date.now(),
      nodeId,
      breachReason,
      detectedRigor,
      smtStatus,
      actionsTaken,
      merkleLeafIndex: leaf.index,
    };

    this.incidents.unshift(record);
    if (this.incidents.length > 40) {
      this.incidents.pop();
    }

    this.emit('directive_dispatched', record);
    return record;
  }
}
