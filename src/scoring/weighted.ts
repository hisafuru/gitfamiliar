import type {
  FolderScore,
  UserIdentity,
  WeightConfig,
  ReviewInfo,
  CommitInfo,
} from "../core/types.js";
import type { GitClient } from "../git/client.js";
import { getUserBlameLines } from "../git/blame.js";
import { getDetailedCommits } from "../git/log.js";
import { walkFiles, recomputeFolderScores } from "../core/file-tree.js";
import { processBatch } from "../utils/batch.js";
import {
  sigmoid,
  recencyDecay,
  scopeFactor,
  normalizedDiff,
  daysBetween,
} from "../utils/math.js";

const REVIEW_BASE_WEIGHTS: Record<string, number> = {
  approved: 0.3,
  commented: 0.15,
  changes_requested: 0.35,
};

function calculateCommitScore(commits: CommitInfo[], now: Date): number {
  let raw = 0;
  for (const c of commits) {
    const nd = normalizedDiff(c.addedLines, c.deletedLines, c.fileSizeAtCommit);
    raw += sigmoid(nd) * recencyDecay(daysBetween(now, c.date));
  }
  return Math.min(1, raw);
}

function calculateReviewScore(
  reviews: ReviewInfo[] | undefined,
  now: Date,
): number {
  if (!reviews) return 0;
  let raw = 0;
  for (const r of reviews) {
    const baseWeight = REVIEW_BASE_WEIGHTS[r.type] || 0.15;
    raw +=
      baseWeight *
      scopeFactor(r.filesInPR) *
      recencyDecay(daysBetween(now, r.date));
  }
  return Math.min(1, raw);
}

/**
 * Score files using the weighted mode (blame + commit + review signals).
 */
export async function scoreWeighted(
  tree: FolderScore,
  gitClient: GitClient,
  user: UserIdentity,
  weights: WeightConfig,
  reviewData?: Map<string, ReviewInfo[]>,
  now?: Date,
): Promise<void> {
  const currentDate = now || new Date();
  const files: Array<{
    path: string;
    setScores: (b: number, c: number, r: number, total: number) => void;
  }> = [];

  walkFiles(tree, (file) => {
    files.push({
      path: file.path,
      setScores: (b, c, r, total) => {
        file.blameScore = b;
        file.commitScore = c;
        file.reviewScore = r;
        file.score = total;
      },
    });
  });

  await processBatch(files, async ({ path, setScores }) => {
    const { userLines, totalLines } = await getUserBlameLines(
      gitClient,
      path,
      user,
    );
    const blameScore = totalLines > 0 ? userLines / totalLines : 0;
    const commitScore = calculateCommitScore(
      await getDetailedCommits(gitClient, user, path),
      currentDate,
    );
    const reviewScore = calculateReviewScore(
      reviewData?.get(path),
      currentDate,
    );

    const total =
      weights.blame * blameScore +
      weights.commit * commitScore +
      weights.review * reviewScore;

    setScores(blameScore, commitScore, reviewScore, total);
  });

  recomputeFolderScores(tree, "continuous");
}
