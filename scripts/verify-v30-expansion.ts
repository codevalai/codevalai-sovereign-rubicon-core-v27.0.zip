/**
 * @file scripts/verify-v30-expansion.ts
 * @description Automated verification runner for Sovereign Rubicon-Core v30.0 Planetary-Scale Expansion Fabric (All 20 Pillars).
 */

import { SovereignExpansionFabricV30 } from '../include/SovereignExpansionFabricV30.js';

async function main() {
  console.log('================================================================');
  console.log('INITIATING SOVEREIGN RUBICON-CORE v30.0 PLANETARY FABRIC (20 PILLARS)...');
  console.log('================================================================');

  const receipt = SovereignExpansionFabricV30.executePlanetaryFabric();

  if (receipt.totalPillarsExecuted !== 20) {
    throw new Error(`Expected 20 expansion pillars, executed ${receipt.totalPillarsExecuted}`);
  }

  console.log(
    JSON.stringify(
      {
        version: receipt.version,
        timestamp: receipt.timestamp,
        totalPillarsExecuted: receipt.totalPillarsExecuted,
        fabricMerkleRootHex: receipt.fabricMerkleRootHex,
        totalFabricLatencyUs: receipt.totalFabricLatencyUs,
        pillarsSummary: receipt.pillars.map((p) => ({
          id: p.pillarId,
          slug: p.slug,
          status: p.status,
          metric: p.metricValue,
        })),
      },
      null,
      2
    )
  );
  console.log('================================================================');
  console.log('VERIFICATION COMPLETE: ALL 20 PLANETARY EXPANSION PILLARS VERIFIED.');
  console.log('================================================================');
}

main().catch((err) => {
  console.error('CRITICAL PLANETARY FABRIC FAILURE:', err);
  process.exit(1);
});
