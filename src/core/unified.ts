import type { CliOptions, UnifiedData } from "./types.js";
import { computeFamiliarity } from "./familiarity.js";
import { computeTeamCoverage } from "./team-coverage.js";
import { computeHotspots } from "./hotspot.js";
import { computeMultiUser } from "./multi-user.js";

export async function computeUnified(
  options: CliOptions,
): Promise<UnifiedData> {
  console.log("Computing unified dashboard data...");

  // Run scoring for all 3 modes
  console.log("  [1/4] Scoring (binary, authorship, weighted)...");
  const [binary, authorship, weighted] = await Promise.all([
    computeFamiliarity({ ...options, mode: "binary" }),
    computeFamiliarity({ ...options, mode: "authorship" }),
    computeFamiliarity({ ...options, mode: "weighted" }),
  ]);

  // Team coverage
  console.log("  [2/4] Team coverage...");
  const coverage = await computeTeamCoverage(options);

  // Hotspots (personal mode for default user)
  console.log("  [3/4] Hotspot analysis...");
  const hotspot = await computeHotspots({
    ...options,
    hotspot: "personal",
  });

  // Multi-user comparison (all contributors)
  console.log("  [4/4] Multi-user comparison...");
  const multiUser = await computeMultiUser({
    ...options,
    team: true,
  });

  console.log("Done.");

  return {
    repoName: binary.repoName,
    userName: binary.userName,
    scoring: { binary, authorship, weighted },
    coverage,
    hotspot,
    multiUser,
  };
}
