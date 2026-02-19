import type {
  FolderScore,
  UserIdentity,
  WeightConfig,
  ReviewInfo,
} from "../core/types.js";
import type { GitClient } from "../git/client.js";
import { getUserBlameLines } from "../git/blame.js";
import { getDetailedCommits } from "../git/log.js";
import { walkFiles, recomputeFolderScores } from "../core/file-tree.js";
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
    lines: number;
    setScores: (b: number, c: number, r: number, total: number) => void;
  }> = [];

  walkFiles(tree, (file) => {
    files.push({
      path: file.path,
      lines: file.lines,
      setScores: (b, c, r, total) => {
        file.blameScore = b;
        file.commitScore = c;
        file.reviewScore = r;
        file.score = total;
      },
    });
  });

  const BATCH_SIZE = 10;
  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    const batch = files.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async ({ path, lines, setScores }) => {
        // 1. blame_score
        const { userLines, totalLines } = await getUserBlameLines(
          gitClient,
          path,
          user,
        );
        const blameScore = totalLines > 0 ? userLines / totalLines : 0;

        // 2. commit_score
        const commits = await getDetailedCommits(gitClient, user, path);
        let commitScoreRaw = 0;
        for (const c of commits) {
          const nd = normalizedDiff(
            c.addedLines,
            c.deletedLines,
            c.fileSizeAtCommit,
          );
          const sig = sigmoid(nd);
          const days = daysBetween(currentDate, c.date);
          const decay = recencyDecay(days);
          commitScoreRaw += sig * decay;
        }
        const commitScore = Math.min(1, commitScoreRaw);

        // 3. review_score
        let reviewScoreRaw = 0;
        const reviews = reviewData?.get(path);
        if (reviews) {
          for (const r of reviews) {
            const baseWeight = REVIEW_BASE_WEIGHTS[r.type] || 0.15;
            const sf = scopeFactor(r.filesInPR);
            const days = daysBetween(currentDate, r.date);
            const decay = recencyDecay(days);
            reviewScoreRaw += baseWeight * sf * decay;
          }
        }
        const reviewScore = Math.min(1, reviewScoreRaw);

        // Combined score
        const total =
          weights.blame * blameScore +
          weights.commit * commitScore +
          weights.review * reviewScore;

        setScores(blameScore, commitScore, reviewScore, total);
      }),
    );
  }

  recomputeFolderScores(tree, "continuous");
}
