import type {
  CliOptions,
  CoverageFileScore,
  CoverageFolderScore,
  CoverageTreeNode,
  TeamCoverageResult,
} from "./types.js";
import { BUS_FACTOR_TARGET } from "./types.js";
import { classifyCoverageRisk } from "./risk.js";
import { GitClient } from "../git/client.js";
import { createFilter } from "../filter/ignore.js";
import { buildFileTree, walkFiles } from "./file-tree.js";
import {
  bulkGetFileContributors,
  getAllContributors,
} from "../git/contributors.js";

export async function computeTeamCoverage(
  options: CliOptions,
): Promise<TeamCoverageResult> {
  const gitClient = new GitClient(options.repoPath);

  if (!(await gitClient.isRepo())) {
    throw new Error(`"${options.repoPath}" is not a git repository.`);
  }

  const repoRoot = await gitClient.getRepoRoot();
  const repoName = await gitClient.getRepoName();
  const filter = createFilter(repoRoot);
  const tree = await buildFileTree(gitClient, filter);

  // Get all tracked files
  const trackedFiles = new Set<string>();
  walkFiles(tree, (f) => trackedFiles.add(f.path));

  // Bulk get contributors for all files
  const fileContributors = await bulkGetFileContributors(
    gitClient,
    trackedFiles,
  );
  const allContributors = await getAllContributors(gitClient);

  // Build coverage tree
  const coverageTree = buildCoverageTree(tree, fileContributors);

  // Identify risk files
  const riskFiles: CoverageFileScore[] = [];
  walkCoverageFiles(coverageTree, (f) => {
    if (f.contributorCount <= 1) {
      riskFiles.push(f);
    }
  });
  riskFiles.sort((a, b) => a.contributorCount - b.contributorCount);

  return {
    tree: coverageTree,
    repoName,
    totalContributors: allContributors.length,
    totalFiles: tree.fileCount,
    riskFiles,
    overallBusFactor: calculateBusFactor(fileContributors),
  };
}

function buildCoverageTree(
  node: import("./types.js").FolderScore,
  fileContributors: Map<string, Set<string>>,
): CoverageFolderScore {
  const children: CoverageTreeNode[] = [];

  for (const child of node.children) {
    if (child.type === "file") {
      const contributors = fileContributors.get(child.path);
      const names = contributors ? Array.from(contributors) : [];
      children.push({
        type: "file",
        path: child.path,
        lines: child.lines,
        contributorCount: names.length,
        contributors: names,
        riskLevel: classifyCoverageRisk(names.length),
      });
    } else {
      children.push(buildCoverageTree(child, fileContributors));
    }
  }

  // Compute folder aggregates
  const fileScores: CoverageFileScore[] = [];
  walkCoverageFiles(
    {
      type: "folder",
      path: "",
      lines: 0,
      fileCount: 0,
      avgContributors: 0,
      busFactor: 0,
      riskLevel: "safe",
      children,
    },
    (f) => {
      fileScores.push(f);
    },
  );

  const totalContributors = fileScores.reduce(
    (sum, f) => sum + f.contributorCount,
    0,
  );
  const avgContributors =
    fileScores.length > 0 ? totalContributors / fileScores.length : 0;

  // Calculate bus factor for this folder's files
  const folderFileContributors = new Map<string, Set<string>>();
  for (const f of fileScores) {
    folderFileContributors.set(f.path, new Set(f.contributors));
  }
  const busFactor = calculateBusFactor(folderFileContributors);

  return {
    type: "folder",
    path: node.path,
    lines: node.lines,
    fileCount: node.fileCount,
    avgContributors: Math.round(avgContributors * 10) / 10,
    busFactor,
    riskLevel: classifyCoverageRisk(busFactor),
    children,
  };
}

function walkCoverageFiles(
  node: CoverageTreeNode,
  visitor: (file: CoverageFileScore) => void,
): void {
  if (node.type === "file") {
    visitor(node);
  } else {
    for (const child of node.children) {
      walkCoverageFiles(child, visitor);
    }
  }
}

/**
 * Calculate bus factor using greedy set cover.
 * Bus factor = minimum number of people who cover >50% of files.
 */
export function calculateBusFactor(
  fileContributors: Map<string, Set<string>>,
): number {
  const totalFiles = fileContributors.size;
  if (totalFiles === 0) return 0;

  const target = Math.ceil(totalFiles * BUS_FACTOR_TARGET);

  // Count files per contributor
  const contributorFiles = new Map<string, Set<string>>();
  for (const [file, contributors] of fileContributors) {
    for (const contributor of contributors) {
      let files = contributorFiles.get(contributor);
      if (!files) {
        files = new Set<string>();
        contributorFiles.set(contributor, files);
      }
      files.add(file);
    }
  }

  // Greedy: pick contributor covering most uncovered files
  const coveredFiles = new Set<string>();
  let count = 0;

  while (coveredFiles.size < target && contributorFiles.size > 0) {
    let bestContributor = "";
    let bestNewFiles = 0;

    for (const [contributor, files] of contributorFiles) {
      let newFiles = 0;
      for (const file of files) {
        if (!coveredFiles.has(file)) newFiles++;
      }
      if (newFiles > bestNewFiles) {
        bestNewFiles = newFiles;
        bestContributor = contributor;
      }
    }

    if (bestNewFiles === 0) break;

    const files = contributorFiles.get(bestContributor)!;
    for (const file of files) {
      coveredFiles.add(file);
    }
    contributorFiles.delete(bestContributor);
    count++;
  }

  return count;
}
