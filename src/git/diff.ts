import type { GitClient } from './client.js';

/**
 * Calculate how much a file has changed since a given commit.
 * Returns the ratio of changed lines to current total lines.
 * Used for change-based expiration policy.
 */
export async function getChangeRatio(
  gitClient: GitClient,
  filePath: string,
  sinceCommit: string,
): Promise<number> {
  try {
    const output = await gitClient.diff([
      '--numstat',
      `${sinceCommit}..HEAD`,
      '--',
      filePath,
    ]);

    const trimmed = output.trim();
    if (!trimmed) return 0;

    const match = trimmed.match(/^(\d+|-)\t(\d+|-)\t/);
    if (!match) return 0;

    const added = match[1] === '-' ? 0 : parseInt(match[1], 10);
    const deleted = match[2] === '-' ? 0 : parseInt(match[2], 10);
    const changedLines = added + deleted;

    // Get current file line count
    const currentContent = await gitClient.show([`HEAD:${filePath}`]);
    const currentLines = Math.max(1, currentContent.split('\n').length);

    return changedLines / currentLines;
  } catch {
    return 0;
  }
}

/**
 * Get the commit hash for the last time a user touched a file.
 */
export async function getLastTouchCommit(
  gitClient: GitClient,
  filePath: string,
  userEmail: string,
): Promise<string | null> {
  try {
    const output = await gitClient.getLog([
      '--author', userEmail,
      '-1',
      '--pretty=format:%H',
      '--',
      filePath,
    ]);
    const hash = output.trim();
    return hash || null;
  } catch {
    return null;
  }
}
