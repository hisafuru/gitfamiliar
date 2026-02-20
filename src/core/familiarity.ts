import type { CliOptions, FolderScore, ReviewInfo } from "./types.js";
import { GitClient } from "../git/client.js";
import { resolveUser } from "../git/identity.js";
import { createFilter } from "../filter/ignore.js";
import { buildFileTree, walkFiles } from "./file-tree.js";
import { getFilesCommittedByUser } from "../git/log.js";
import { scoreBinary } from "../scoring/binary.js";
import { scoreAuthorship } from "../scoring/authorship.js";
import { scoreReviewCoverage } from "../scoring/review-coverage.js";
import { scoreWeighted } from "../scoring/weighted.js";
import { getExpiredFiles } from "../scoring/expiration.js";
import { fetchReviewData } from "../github/reviews.js";

export interface FamiliarityResult {
  tree: FolderScore;
  repoName: string;
  userName: string;
  mode: string;
  writtenCount: number;
  reviewedCount: number;
  bothCount: number;
  totalFiles: number;
}

export async function computeFamiliarity(
  options: CliOptions,
): Promise<FamiliarityResult> {
  const gitClient = new GitClient(options.repoPath);

  if (!(await gitClient.isRepo())) {
    throw new Error(`"${options.repoPath}" is not a git repository.`);
  }

  const repoRoot = await gitClient.getRepoRoot();
  const repoName = await gitClient.getRepoName();
  const user = await resolveUser(gitClient, options.user);
  const filter = createFilter(repoRoot);
  const tree = await buildFileTree(gitClient, filter);

  // Get written files (used by binary, weighted)
  const writtenFiles = await getFilesCommittedByUser(gitClient, user);

  // Get review data (if available)
  let reviewData: Map<string, ReviewInfo[]> | undefined;
  let reviewedFileSet = new Set<string>();

  if (options.mode !== "authorship") {
    const reviewResult = await fetchReviewData(gitClient, options.user);
    if (reviewResult) {
      reviewData = reviewResult.reviewedFiles;
      reviewedFileSet = reviewResult.reviewedFileSet;
    }
  }

  // Get expired files
  let expiredFiles: Set<string> | undefined;
  if (options.expiration.policy !== "never") {
    const allFiles: string[] = [];
    walkFiles(tree, (f) => allFiles.push(f.path));
    expiredFiles = await getExpiredFiles(
      gitClient,
      allFiles,
      user,
      options.expiration,
    );
  }

  // Score based on mode
  switch (options.mode) {
    case "binary":
      scoreBinary(
        tree,
        writtenFiles,
        reviewedFileSet,
        options.filter,
        expiredFiles,
      );
      break;

    case "authorship":
      await scoreAuthorship(tree, gitClient, user);
      break;

    case "review-coverage":
      if (reviewedFileSet.size === 0) {
        console.error(
          "Warning: No review data available. Set GITHUB_TOKEN or use --user with your GitHub username.",
        );
      }
      scoreReviewCoverage(tree, reviewedFileSet);
      break;

    case "weighted":
      await scoreWeighted(tree, gitClient, user, options.weights, reviewData);
      break;
  }

  return {
    tree,
    repoName,
    userName: user.name || user.email,
    mode: options.mode,
    ...computeSummary(tree, writtenFiles, reviewedFileSet),
    totalFiles: tree.fileCount,
  };
}

function computeSummary(
  tree: FolderScore,
  writtenFiles: Set<string>,
  reviewedFileSet: Set<string>,
): { writtenCount: number; reviewedCount: number; bothCount: number } {
  let writtenOnly = 0;
  let reviewedOnly = 0;
  let both = 0;

  walkFiles(tree, (file) => {
    const w = writtenFiles.has(file.path);
    const r = reviewedFileSet.has(file.path);
    if (w && r) both++;
    else if (w) writtenOnly++;
    else if (r) reviewedOnly++;
  });

  return {
    writtenCount: writtenOnly + both,
    reviewedCount: reviewedOnly + both,
    bothCount: both,
  };
}
