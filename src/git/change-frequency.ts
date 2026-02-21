import type { GitClient } from "./client.js";

const COMMIT_SEP = "GITFAMILIAR_FREQ_SEP";

export interface FileChangeFrequency {
  commitCount: number;
  lastChanged: Date | null;
}

/**
 * Bulk get change frequency for all files in a single git log call.
 * Returns Map of filePath → { commitCount, lastChanged } within the given window.
 */
export async function bulkGetChangeFrequency(
  gitClient: GitClient,
  days: number,
  trackedFiles: Set<string>,
): Promise<Map<string, FileChangeFrequency>> {
  const sinceDate = `${days} days ago`;

  const output = await gitClient.getLog([
    "--all",
    `--since=${sinceDate}`,
    "--name-only",
    `--format=${COMMIT_SEP}%aI`,
  ]);

  const result = new Map<string, FileChangeFrequency>();

  let currentDate: Date | null = null;

  for (const line of output.split("\n")) {
    if (line.startsWith(COMMIT_SEP)) {
      const dateStr = line.slice(COMMIT_SEP.length).trim();
      currentDate = dateStr ? new Date(dateStr) : null;
      continue;
    }

    const filePath = line.trim();
    if (!filePath || !trackedFiles.has(filePath)) continue;

    let entry = result.get(filePath);
    if (!entry) {
      entry = { commitCount: 0, lastChanged: null };
      result.set(filePath, entry);
    }
    entry.commitCount++;

    if (currentDate && (!entry.lastChanged || currentDate > entry.lastChanged)) {
      entry.lastChanged = currentDate;
    }
  }

  return result;
}
