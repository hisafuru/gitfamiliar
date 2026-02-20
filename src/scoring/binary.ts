import type { FolderScore, FilterMode } from "../core/types.js";
import { walkFiles, recomputeFolderScores } from "../core/file-tree.js";

/**
 * Score files in binary mode (read / not read).
 */
export function scoreBinary(
  tree: FolderScore,
  writtenFiles: Set<string>,
  reviewedFiles: Set<string>,
  filterMode: FilterMode,
  expiredFiles?: Set<string>,
): void {
  walkFiles(tree, (file) => {
    const isWritten = writtenFiles.has(file.path);
    const isReviewed =
      reviewedFiles.has(file.path) && !writtenFiles.has(file.path);
    const isExpired = expiredFiles?.has(file.path) ?? false;

    file.isWritten = isWritten;
    file.isReviewed = isReviewed;
    file.isExpired = isExpired;

    if (isExpired) {
      file.score = 0;
      return;
    }

    switch (filterMode) {
      case "written":
        file.score = isWritten ? 1 : 0;
        break;
      case "reviewed":
        file.score = isReviewed ? 1 : 0;
        break;
      case "all":
      default:
        file.score = isWritten || isReviewed ? 1 : 0;
        break;
    }
  });

  recomputeFolderScores(tree, "binary");
}
