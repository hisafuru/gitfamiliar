import type { CliOptions, UnifiedData } from "./types.js";
import { computeFamiliarity } from "./familiarity.js";
import { computeTeamCoverage } from "./team-coverage.js";
import { computeHotspots, computeTeamAvgFamiliarity } from "./hotspot.js";
import { computeMultiUser } from "./multi-user.js";
import { GitClient } from "../git/client.js";
import { createFilter } from "../filter/ignore.js";
import { buildFileTree, walkFiles } from "./file-tree.js";

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
  console.log("  [3/5] Hotspot analysis...");
  const hotspot = await computeHotspots({
    ...options,
    hotspot: "personal",
  });

  // Team familiarity for hotspot mode switching in browser
  console.log("  [4/5] Hotspot team familiarity...");
  const gitClient = new GitClient(options.repoPath);
  const repoRoot = await gitClient.getRepoRoot();
  const filter = createFilter(repoRoot);
  const tree = await buildFileTree(gitClient, filter);
  const trackedFiles = new Set<string>();
  walkFiles(tree, (f) => trackedFiles.add(f.path));
  const teamFamMap = await computeTeamAvgFamiliarity(
    gitClient,
    trackedFiles,
    options,
  );
  const hotspotTeamFamiliarity: Record<string, number> = {};
  for (const [k, v] of teamFamMap) hotspotTeamFamiliarity[k] = v;

  // Multi-user comparison (all contributors)
  console.log("  [5/5] Multi-user comparison...");
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
    hotspotTeamFamiliarity,
    multiUser,
  };
}
