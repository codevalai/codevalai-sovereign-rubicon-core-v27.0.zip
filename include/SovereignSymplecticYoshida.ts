/**
 * @file include/SovereignSymplecticYoshida.ts
 * @version 26.1.0 (4th-Order Symplectic Yoshida Orbital Integrator with J2 Zonal Harmonics)
 * @description Real phase-space volume-preserving 4th-order Yoshida symplectic integration
 * over LEO constellation dynamics with Earth J2 oblateness perturbation and Hamiltonian invariants.
 */

export interface OrbitalStateVector {
  rKm: [number, number, number]; // ECI position (km)
  vKmPerSec: [number, number, number]; // ECI velocity (km/s)
}

export interface YoshidaPropagationReport {
  stepsExecuted: number;
  timeStepSec: number;
  initialHamiltonianEnergy: number;
  finalHamiltonianEnergy: number;
  relativeEnergyDrift: number;
  symplecticInvariantPreserved: boolean;
  finalPositionKm: [number, number, number];
  executionLatencyUs: number;
}

export class SovereignSymplecticYoshida {
  private static readonly MU_EARTH = 398600.4418; // km^3 / s^2
  private static readonly R_EARTH = 6378.137; // km
  private static readonly J2 = 1.08262668e-3;

  // Yoshida 4th-order symplectic integrator coefficients
  private static readonly CBRT2 = Math.cbrt(2);
  private static readonly W0 = -SovereignSymplecticYoshida.CBRT2 / (2 - SovereignSymplecticYoshida.CBRT2);
  private static readonly W1 = 1 / (2 - SovereignSymplecticYoshida.CBRT2);
  private static readonly C1 = SovereignSymplecticYoshida.W1 / 2;
  private static readonly C4 = SovereignSymplecticYoshida.C1;
  private static readonly C2 = (SovereignSymplecticYoshida.W0 + SovereignSymplecticYoshida.W1) / 2;
  private static readonly C3 = SovereignSymplecticYoshida.C2;
  private static readonly D1 = SovereignSymplecticYoshida.W1;
  private static readonly D2 = SovereignSymplecticYoshida.W0;
  private static readonly D3 = SovereignSymplecticYoshida.W1;

  /**
   * Computes gravitational + J2 zonal harmonic acceleration vector a(r) in ECI frame.
   */
  public static computeAcceleration(r: [number, number, number]): [number, number, number] {
    const [x, y, z] = r;
    const r2 = x * x + y * y + z * z;
    const rNorm = Math.sqrt(r2);
    const r3 = r2 * rNorm;
    const r5 = r2 * r3;

    const base = -this.MU_EARTH / r3;
    const j2Factor = (1.5 * this.J2 * this.MU_EARTH * this.R_EARTH * this.R_EARTH) / r5;
    const z2OverR2 = (z * z) / r2;

    const ax = x * (base + j2Factor * (5 * z2OverR2 - 1));
    const ay = y * (base + j2Factor * (5 * z2OverR2 - 1));
    const az = z * (base + j2Factor * (5 * z2OverR2 - 3));
    return [ax, ay, az];
  }

  /**
   * Computes the total specific mechanical Hamiltonian H = 1/2 |v|^2 + U_0(r) + U_J2(r).
   */
  public static computeHamiltonian(state: OrbitalStateVector): number {
    const [x, y, z] = state.rKm;
    const [vx, vy, vz] = state.vKmPerSec;
    const r2 = x * x + y * y + z * z;
    const rNorm = Math.sqrt(r2);
    const r3 = r2 * rNorm;

    const kinetic = 0.5 * (vx * vx + vy * vy + vz * vz);
    const potentialCentral = -this.MU_EARTH / rNorm;
    const sin2Lat = (z * z) / r2;
    const potentialJ2 =
      ((this.MU_EARTH * this.J2 * this.R_EARTH * this.R_EARTH) / (2 * r3)) * (3 * sin2Lat - 1);

    return kinetic + potentialCentral + potentialJ2;
  }

  /**
   * Executes a single 4th-order Symplectic Yoshida step of duration dtSec.
   */
  public static stepYoshida4(state: OrbitalStateVector, dtSec: number): OrbitalStateVector {
    const r: [number, number, number] = [...state.rKm];
    const v: [number, number, number] = [...state.vKmPerSec];
    const c = [this.C1, this.C2, this.C3, this.C4];
    const d = [this.D1, this.D2, this.D3];

    for (let k = 0; k < 3; k++) {
      r[0] += c[k] * v[0] * dtSec;
      r[1] += c[k] * v[1] * dtSec;
      r[2] += c[k] * v[2] * dtSec;

      const a = this.computeAcceleration(r);
      v[0] += d[k] * a[0] * dtSec;
      v[1] += d[k] * a[1] * dtSec;
      v[2] += d[k] * a[2] * dtSec;
    }

    r[0] += c[3] * v[0] * dtSec;
    r[1] += c[3] * v[1] * dtSec;
    r[2] += c[3] * v[2] * dtSec;

    return { rKm: r, vKmPerSec: v };
  }

  /**
   * Propagates a Sun-Synchronous LEO satellite orbit over `steps` intervals and verifies
   * Liouville symplectic Hamiltonian conservation.
   */
  public static propagateOrbit(
    steps: number = 200,
    dtSec: number = 1.0
  ): YoshidaPropagationReport {
    const t0 = process.hrtime.bigint();
    let state: OrbitalStateVector = {
      rKm: [6878.137, 0.0, 0.0], // 500 km altitude LEO
      vKmPerSec: [0.0, 5.412, 5.385], // ~97.4 deg inclination
    };

    const h0 = this.computeHamiltonian(state);
    for (let s = 0; s < steps; s++) {
      state = this.stepYoshida4(state, dtSec);
    }
    const hFinal = this.computeHamiltonian(state);
    const relDrift = Math.abs((hFinal - h0) / h0);
    const latencyUs = Number(process.hrtime.bigint() - t0) / 1000;

    return {
      stepsExecuted: steps,
      timeStepSec: dtSec,
      initialHamiltonianEnergy: Number(h0.toFixed(8)),
      finalHamiltonianEnergy: Number(hFinal.toFixed(8)),
      relativeEnergyDrift: Number(relDrift.toExponential(4)),
      symplecticInvariantPreserved: relDrift < 1e-9,
      finalPositionKm: [
        Number(state.rKm[0].toFixed(4)),
        Number(state.rKm[1].toFixed(4)),
        Number(state.rKm[2].toFixed(4)),
      ],
      executionLatencyUs: Number(latencyUs.toFixed(2)),
    };
  }
}
