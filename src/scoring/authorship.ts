import type { FolderScore, UserIdentity } from "../core/types.js";
import type { GitClient } from "../git/client.js";
import { getUserBlameLines } from "../git/blame.js";
import { walkFiles, recomputeFolderScores } from "../core/file-tree.js";

/**
 * Score files by authorship (git blame-based).
 * score(file) = blame_lines(user) / total_lines(file)
 */
export async function scoreAuthorship(
  tree: FolderScore,
  gitClient: GitClient,
  user: UserIdentity,
): Promise<void> {
  const files: Array<{ path: string; setScore: (s: number) => void }> = [];

  walkFiles(tree, (file) => {
    files.push({
      path: file.path,
      setScore: (s) => {
        file.score = s;
        file.blameScore = s;
      },
    });
  });

  // Process in batches to avoid overwhelming git
  const BATCH_SIZE = 10;
  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    const batch = files.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async ({ path, setScore }) => {
        const { userLines, totalLines } = await getUserBlameLines(
          gitClient,
          path,
          user,
        );
        setScore(totalLines > 0 ? userLines / totalLines : 0);
      }),
    );
  }

  recomputeFolderScores(tree, "continuous");
}
