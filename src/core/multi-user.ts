import type {
  CliOptions,
  MultiUserResult,
  MultiUserFolderScore,
  MultiUserFileScore,
  MultiUserTreeNode,
  UserScore,
  UserSummary,
  UserIdentity,
  FolderScore,
  FileScore,
  TreeNode,
} from "./types.js";
import { GitClient } from "../git/client.js";
import { computeFamiliarity, type FamiliarityResult } from "./familiarity.js";
import { getAllContributors } from "../git/contributors.js";
import { resolveUser } from "../git/identity.js";
import { processBatch } from "../utils/batch.js";
import { walkFiles } from "./file-tree.js";

export async function computeMultiUser(
  options: CliOptions,
): Promise<MultiUserResult> {
  const gitClient = new GitClient(options.repoPath);

  if (!(await gitClient.isRepo())) {
    throw new Error(`"${options.repoPath}" is not a git repository.`);
  }

  const repoName = await gitClient.getRepoName();

  // Determine which users to compare
  let userNames: string[];
  if (options.team) {
    const contributors = await getAllContributors(gitClient, 3);
    userNames = contributors.map((c) => c.name);
    if (userNames.length === 0) {
      throw new Error("No contributors found with 3+ commits.");
    }
    console.log(`Found ${userNames.length} contributors with 3+ commits`);
  } else if (Array.isArray(options.user)) {
    userNames = options.user;
  } else if (options.user) {
    userNames = [options.user];
  } else {
    // Default: current user only
    const user = await resolveUser(gitClient);
    userNames = [user.name || user.email];
  }

  // Run scoring for each user (batched, 3 at a time)
  const results: Array<{ userName: string; result: FamiliarityResult }> = [];

  await processBatch(
    userNames,
    async (userName) => {
      const userOptions: CliOptions = {
        ...options,
        user: userName,
        team: false,
        teamCoverage: false,
      };
      const result = await computeFamiliarity(userOptions);
      results.push({ userName, result });
    },
    3,
  );

  // Resolve user identities
  const users: UserIdentity[] = results.map((r) => ({
    name: r.result.userName,
    email: "",
  }));

  // Merge results into multi-user tree
  const tree = mergeResults(results);

  // Compute user summaries
  const userSummaries: UserSummary[] = results.map((r) => ({
    user: { name: r.result.userName, email: "" },
    writtenCount: r.result.writtenCount,
    reviewedCount: r.result.reviewedCount,
    overallScore: r.result.tree.score,
  }));

  return {
    tree,
    repoName,
    users,
    mode: options.mode,
    totalFiles: results[0]?.result.totalFiles || 0,
    userSummaries,
  };
}

function mergeResults(
  results: Array<{ userName: string; result: FamiliarityResult }>,
): MultiUserFolderScore {
  if (results.length === 0) {
    return {
      type: "folder",
      path: "",
      lines: 0,
      score: 0,
      fileCount: 0,
      userScores: [],
      children: [],
    };
  }

  // Use first result as the structural template
  const baseTree = results[0].result.tree;

  // Build a map from file path → per-user scores
  const fileScoresMap = new Map<string, UserScore[]>();
  for (const { result } of results) {
    const userName = result.userName;
    walkFiles(result.tree, (file: FileScore) => {
      let scores = fileScoresMap.get(file.path);
      if (!scores) {
        scores = [];
        fileScoresMap.set(file.path, scores);
      }
      scores.push({
        user: { name: userName, email: "" },
        score: file.score,
        isWritten: file.isWritten,
        isReviewed: file.isReviewed,
      });
    });
  }

  return convertFolder(baseTree, fileScoresMap, results);
}

function convertFolder(
  node: FolderScore,
  fileScoresMap: Map<string, UserScore[]>,
  results: Array<{ userName: string; result: FamiliarityResult }>,
): MultiUserFolderScore {
  const children: MultiUserTreeNode[] = [];

  for (const child of node.children) {
    if (child.type === "file") {
      const userScores = fileScoresMap.get(child.path) || [];
      const avgScore =
        userScores.length > 0
          ? userScores.reduce((sum, s) => sum + s.score, 0) / userScores.length
          : 0;
      children.push({
        type: "file",
        path: child.path,
        lines: child.lines,
        score: avgScore,
        userScores,
      });
    } else {
      children.push(convertFolder(child, fileScoresMap, results));
    }
  }

  // Compute folder-level user scores
  const userScores: UserScore[] = results.map(({ result }) => {
    // Find this folder in the user's result tree
    const folderNode = findFolderInTree(result.tree, node.path);
    return {
      user: { name: result.userName, email: "" },
      score: folderNode?.score || 0,
    };
  });

  const avgScore =
    userScores.length > 0
      ? userScores.reduce((sum, s) => sum + s.score, 0) / userScores.length
      : 0;

  return {
    type: "folder",
    path: node.path,
    lines: node.lines,
    score: avgScore,
    fileCount: node.fileCount,
    userScores,
    children,
  };
}

function findFolderInTree(
  node: TreeNode,
  targetPath: string,
): FolderScore | null {
  if (node.type === "folder") {
    if (node.path === targetPath) return node;
    for (const child of node.children) {
      const found = findFolderInTree(child, targetPath);
      if (found) return found;
    }
  }
  return null;
}
