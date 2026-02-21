import type {
  CliOptions,
  HotspotFileScore,
  HotspotResult,
  HotspotRiskLevel,
  FileScore,
} from "./types.js";
import { GitClient } from "../git/client.js";
import { createFilter } from "../filter/ignore.js";
import { buildFileTree, walkFiles } from "./file-tree.js";
import { computeFamiliarity } from "./familiarity.js";
import { bulkGetChangeFrequency } from "../git/change-frequency.js";
import { bulkGetFileContributors, getAllContributors } from "../git/contributors.js";
import { processBatch } from "../utils/batch.js";
import { resolveUser } from "../git/identity.js";

const DEFAULT_WINDOW = 90;

export async function computeHotspots(
  options: CliOptions,
): Promise<HotspotResult> {
  const gitClient = new GitClient(options.repoPath);

  if (!(await gitClient.isRepo())) {
    throw new Error(`"${options.repoPath}" is not a git repository.`);
  }

  const repoName = await gitClient.getRepoName();
  const repoRoot = await gitClient.getRepoRoot();
  const filter = createFilter(repoRoot);
  const tree = await buildFileTree(gitClient, filter);
  const timeWindow = options.window || DEFAULT_WINDOW;
  const isTeamMode = options.hotspot === "team";

  // Get all tracked files
  const trackedFiles = new Set<string>();
  walkFiles(tree, (f) => trackedFiles.add(f.path));

  // Get change frequency for all files (single git log call)
  const changeFreqMap = await bulkGetChangeFrequency(gitClient, timeWindow, trackedFiles);

  // Get familiarity scores
  let familiarityMap: Map<string, number>;
  let userName: string | undefined;

  if (isTeamMode) {
    // Team mode: average familiarity across all contributors
    familiarityMap = await computeTeamAvgFamiliarity(gitClient, trackedFiles, options);
  } else {
    // Personal mode: single user's familiarity
    const userFlag = Array.isArray(options.user) ? options.user[0] : options.user;
    const result = await computeFamiliarity({ ...options, team: false, teamCoverage: false });
    userName = result.userName;
    familiarityMap = new Map<string, number>();
    walkFiles(result.tree, (f) => {
      familiarityMap.set(f.path, f.score);
    });
  }

  // Find max change frequency for normalization
  let maxFreq = 0;
  for (const entry of changeFreqMap.values()) {
    if (entry.commitCount > maxFreq) maxFreq = entry.commitCount;
  }

  // Calculate risk for each file
  const hotspotFiles: HotspotFileScore[] = [];

  for (const filePath of trackedFiles) {
    const freq = changeFreqMap.get(filePath);
    const changeFrequency = freq?.commitCount || 0;
    const lastChanged = freq?.lastChanged || null;
    const familiarity = familiarityMap.get(filePath) || 0;

    // Normalize frequency to 0-1
    const normalizedFreq = maxFreq > 0 ? changeFrequency / maxFreq : 0;

    // Risk = normalizedFrequency × (1 - familiarity)
    const risk = normalizedFreq * (1 - familiarity);

    // Find lines from tree
    let lines = 0;
    walkFiles(tree, (f) => {
      if (f.path === filePath) lines = f.lines;
    });

    hotspotFiles.push({
      path: filePath,
      lines,
      familiarity,
      changeFrequency,
      lastChanged,
      risk,
      riskLevel: classifyHotspotRisk(risk),
    });
  }

  // Sort by risk descending
  hotspotFiles.sort((a, b) => b.risk - a.risk);

  // Compute summary
  const summary = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const f of hotspotFiles) {
    summary[f.riskLevel]++;
  }

  return {
    files: hotspotFiles,
    repoName,
    userName,
    hotspotMode: isTeamMode ? "team" : "personal",
    timeWindow,
    summary,
  };
}

export function classifyHotspotRisk(risk: number): HotspotRiskLevel {
  if (risk >= 0.6) return "critical";
  if (risk >= 0.4) return "high";
  if (risk >= 0.2) return "medium";
  return "low";
}

/**
 * For team mode: compute average familiarity across all contributors.
 * Uses bulkGetFileContributors (single git log call) to count how many people
 * know each file, then normalizes as: avgFam = contributorCount / totalContributors.
 * This is a lightweight proxy for "how well-known is this file across the team".
 */
async function computeTeamAvgFamiliarity(
  gitClient: GitClient,
  trackedFiles: Set<string>,
  options: CliOptions,
): Promise<Map<string, number>> {
  const contributors = await getAllContributors(gitClient, 1);
  const totalContributors = Math.max(1, contributors.length);
  const fileContributors = await bulkGetFileContributors(gitClient, trackedFiles);

  const result = new Map<string, number>();
  for (const filePath of trackedFiles) {
    const contribs = fileContributors.get(filePath);
    const count = contribs ? contribs.size : 0;
    // Normalize: what fraction of the team knows this file
    // Cap at 1.0 (e.g., if everyone knows it)
    result.set(filePath, Math.min(1, count / Math.max(1, totalContributors * 0.3)));
  }

  return result;
}
