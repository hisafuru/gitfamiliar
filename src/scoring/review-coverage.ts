import type { FolderScore, ReviewInfo } from '../core/types.js';
import { walkFiles, recomputeFolderScores } from '../core/file-tree.js';

/**
 * Score files by review coverage.
 * Files that the user has reviewed (via PR) get score 1, others 0.
 * User's own commits are excluded.
 */
export function scoreReviewCoverage(
  tree: FolderScore,
  reviewedFiles: Set<string>,
): void {
  walkFiles(tree, (file) => {
    file.isReviewed = reviewedFiles.has(file.path);
    file.score = file.isReviewed ? 1 : 0;
  });

  recomputeFolderScores(tree, 'binary');
}
