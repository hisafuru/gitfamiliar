import type { GitClient } from './client.js';
import type { UserIdentity, CommitInfo } from '../core/types.js';
import { matchesUser } from './identity.js';

/**
 * Get the set of files that a user has committed to (any commit, any time).
 * Used for Binary mode.
 */
export async function getFilesCommittedByUser(
  gitClient: GitClient,
  user: UserIdentity,
): Promise<Set<string>> {
  const files = new Set<string>();

  // Get commits by the user's email and name
  const queries = [];
  if (user.email) {
    queries.push(['--author', user.email]);
  }
  if (user.name && user.name !== user.email) {
    queries.push(['--author', user.name]);
  }

  for (const authorArgs of queries) {
    try {
      const output = await gitClient.getLog([
        ...authorArgs,
        '--name-only',
        '--pretty=format:',
        '--all',
      ]);
      for (const line of output.split('\n')) {
        const trimmed = line.trim();
        if (trimmed) {
          files.add(trimmed);
        }
      }
    } catch {
      // Skip if no commits found
    }
  }

  return files;
}

/**
 * Get detailed commit information for a specific file by a specific user.
 * Used for Weighted mode's commit_score.
 */
export async function getDetailedCommits(
  gitClient: GitClient,
  user: UserIdentity,
  filePath: string,
): Promise<CommitInfo[]> {
  const commits: CommitInfo[] = [];

  const authorArgs = user.email ? ['--author', user.email] : ['--author', user.name];

  try {
    const output = await gitClient.getLog([
      ...authorArgs,
      '--numstat',
      '--pretty=format:%H|%aI',
      '--',
      filePath,
    ]);

    const lines = output.trim().split('\n');
    let currentHash = '';
    let currentDate = new Date();

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      if (trimmed.includes('|')) {
        const parts = trimmed.split('|');
        currentHash = parts[0];
        currentDate = new Date(parts[1]);
      } else {
        const statMatch = trimmed.match(/^(\d+|-)\t(\d+|-)\t(.+)$/);
        if (statMatch && statMatch[3] === filePath) {
          const added = statMatch[1] === '-' ? 0 : parseInt(statMatch[1], 10);
          const deleted = statMatch[2] === '-' ? 0 : parseInt(statMatch[2], 10);

          // Get file size at that commit
          let fileSizeAtCommit = 1;
          try {
            const content = await gitClient.show([`${currentHash}:${filePath}`]);
            fileSizeAtCommit = Math.max(1, content.split('\n').length);
          } catch {
            fileSizeAtCommit = Math.max(1, added);
          }

          commits.push({
            hash: currentHash,
            date: currentDate,
            addedLines: added,
            deletedLines: deleted,
            fileSizeAtCommit,
          });
        }
      }
    }
  } catch {
    // No commits found
  }

  return commits;
}

/**
 * Get the last date a user touched a specific file (commit).
 */
export async function getLastCommitDate(
  gitClient: GitClient,
  user: UserIdentity,
  filePath: string,
): Promise<Date | null> {
  const authorArgs = user.email ? ['--author', user.email] : ['--author', user.name];

  try {
    const output = await gitClient.getLog([
      ...authorArgs,
      '-1',
      '--pretty=format:%aI',
      '--',
      filePath,
    ]);
    const trimmed = output.trim();
    if (trimmed) {
      return new Date(trimmed);
    }
  } catch {
    // No commits found
  }
  return null;
}
