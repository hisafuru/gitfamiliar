import type { FolderScore } from "../core/types.js";
import { walkFiles, recomputeFolderScores } from "../core/file-tree.js";

/**
 * Score files in committed mode (written / not written).
 */
export function scoreCommitted(
  tree: FolderScore,
  writtenFiles: Set<string>,
  expiredFiles?: Set<string>,
): void {
  walkFiles(tree, (file) => {
    const isWritten = writtenFiles.has(file.path);
    const isExpired = expiredFiles?.has(file.path) ?? false;

    file.isWritten = isWritten;
    file.isExpired = isExpired;

    if (isExpired) {
      file.score = 0;
      return;
    }

    file.score = isWritten ? 1 : 0;
  });

  recomputeFolderScores(tree, "committed");
}
