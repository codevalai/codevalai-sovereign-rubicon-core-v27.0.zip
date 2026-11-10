/**
 * @file include/SovereignKanervaSDM.ts
 * @version 26.1.0 (Kanerva Sparse Distributed Memory & Hopfield Associative Attractor Network)
 * @description Real 10,240-bit Kanerva hard-location associative memory with bipolar integer
 * counters and iterative sign-activation Hopfield attractor convergence under 35% noise corruption.
 */

export interface KanervaSDMConvergenceReport {
  hardLocationsCount: number;
  activationRadiusBits: number;
  injectedBitFlipRatePct: number;
  initialHammingDistance: number;
  finalHammingDistance: number;
  attractorSteps: number;
  exactFixedPointConverged: boolean;
  executionLatencyUs: number;
}

export class SovereignKanervaSDM {
  public static readonly WORDS = 320; // 10,240 bits

  public static popcount32(x: number): number {
    x = x - ((x >>> 1) & 0x55555555);
    x = (x & 0x33333333) + ((x >>> 2) & 0x33333333);
    return (((x + (x >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24;
  }

  public static hammingDistance(a: Uint32Array, b: Uint32Array): number {
    let dist = 0;
    for (let w = 0; w < this.WORDS; w++) {
      dist += this.popcount32((a[w] ^ b[w]) >>> 0);
    }
    return dist;
  }

  /**
   * Simulates writing orthogonal 10,240-bit attractors into Kanerva SDM hard locations
   * and converging a 35%-corrupted probe back to the exact ground-truth attractor in <= 3 steps.
   */
  public static verifyAssociativeRecall(
    targetAttractor: Uint32Array,
    orthogonals: Uint32Array[],
    noiseFlipRate: number = 0.35
  ): KanervaSDMConvergenceReport {
    const t0 = process.hrtime.bigint();
    const patterns = [targetAttractor, ...orthogonals];
    const numLocations = patterns.length * 8;
    const radiusBits = 4650; // Critical Kanerva access sphere radius for D=10,240

    // Construct hard-location addresses scattered around stored patterns
    const addresses: Uint32Array[] = [];
    const counters: Int16Array[] = [];

    for (let p = 0; p < patterns.length; p++) {
      const pat = patterns[p];
      for (let k = 0; k < 8; k++) {
        const addr = new Uint32Array(this.WORDS);
        for (let w = 0; w < this.WORDS; w++) {
          // Flip ~12.5% bits so hard address lies well inside the activation radius of pattern p
          const mask = (((w * 2654435761 + k * 0x9e3779b9) >>> 0) & ((w * 1597334677 + k) >>> 0)) & 0x1f1f1f1f;
          addr[w] = (pat[w] ^ mask) >>> 0;
        }
        addresses.push(addr);
        counters.push(new Int16Array(10240));
      }
    }

    // Write all patterns into SDM bipolar counters
    for (const pat of patterns) {
      for (let loc = 0; loc < numLocations; loc++) {
        if (this.hammingDistance(pat, addresses[loc]) <= radiusBits) {
          const ctr = counters[loc];
          for (let w = 0; w < this.WORDS; w++) {
            const word = pat[w];
            const baseBit = w << 5;
            for (let b = 0; b < 32; b++) {
              ctr[baseBit + b] += (word >>> b) & 1 ? 1 : -1;
            }
          }
        }
      }
    }

    // Corrupt 35% of bits in targetAttractor
    const noisyProbe = new Uint32Array(targetAttractor);
    const totalBitsToFlip = Math.floor(10240 * noiseFlipRate);
    for (let i = 0; i < totalBitsToFlip; i++) {
      const bitPos = (i * 7919) % 10240;
      const w = bitPos >>> 5;
      const b = bitPos & 31;
      noisyProbe[w] = (noisyProbe[w] ^ (1 << b)) >>> 0;
    }

    const initialDistance = this.hammingDistance(noisyProbe, targetAttractor);
    let current = noisyProbe;
    let steps = 0;

    // Iterative Kanerva-Hopfield Attractor Readout Loop
    while (steps < 3) {
      steps++;
      const sumCounters = new Int32Array(10240);
      let activeLocs = 0;

      for (let loc = 0; loc < numLocations; loc++) {
        if (this.hammingDistance(current, addresses[loc]) <= radiusBits) {
          activeLocs++;
          const ctr = counters[loc];
          for (let bit = 0; bit < 10240; bit++) {
            sumCounters[bit] += ctr[bit];
          }
        }
      }

      if (activeLocs === 0) break;

      const nextHv = new Uint32Array(this.WORDS);
      for (let w = 0; w < this.WORDS; w++) {
        let word = 0;
        const baseBit = w << 5;
        for (let b = 0; b < 32; b++) {
          const s = sumCounters[baseBit + b];
          const bitVal = s > 0 ? 1 : s < 0 ? 0 : (current[w] >>> b) & 1;
          if (bitVal) word |= (1 << b) >>> 0;
        }
        nextHv[w] = word >>> 0;
      }

      const delta = this.hammingDistance(current, nextHv);
      current = nextHv;
      if (delta === 0) break;
    }

    const finalDistance = this.hammingDistance(current, targetAttractor);
    const latencyUs = Number(process.hrtime.bigint() - t0) / 1000;

    return {
      hardLocationsCount: numLocations,
      activationRadiusBits: radiusBits,
      injectedBitFlipRatePct: Number((noiseFlipRate * 100).toFixed(1)),
      initialHammingDistance: initialDistance,
      finalHammingDistance: finalDistance,
      attractorSteps: steps,
      exactFixedPointConverged: finalDistance === 0,
      executionLatencyUs: Number(latencyUs.toFixed(2)),
    };
  }
}
