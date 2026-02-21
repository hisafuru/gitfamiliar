import type {
  FolderScore,
  UserIdentity,
  WeightConfig,
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
  normalizedDiff,
  daysBetween,
} from "../utils/math.js";

function calculateCommitScore(commits: CommitInfo[], now: Date): number {
  let raw = 0;
  for (const c of commits) {
    const nd = normalizedDiff(c.addedLines, c.deletedLines, c.fileSizeAtCommit);
    raw += sigmoid(nd) * recencyDecay(daysBetween(now, c.date));
  }
  return Math.min(1, raw);
}

/**
 * Score files using the weighted mode (blame + commit signals).
 */
export async function scoreWeighted(
  tree: FolderScore,
  gitClient: GitClient,
  user: UserIdentity,
  weights: WeightConfig,
  now?: Date,
): Promise<void> {
  const currentDate = now || new Date();
  const files: Array<{
    path: string;
    setScores: (b: number, c: number, total: number) => void;
  }> = [];

  walkFiles(tree, (file) => {
    files.push({
      path: file.path,
      setScores: (b, c, total) => {
        file.blameScore = b;
        file.commitScore = c;
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

    const total = weights.blame * blameScore + weights.commit * commitScore;

    setScores(blameScore, commitScore, total);
  });

  recomputeFolderScores(tree, "continuous");
}
