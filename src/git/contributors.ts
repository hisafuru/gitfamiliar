import type { GitClient } from "./client.js";
import type { UserIdentity } from "../core/types.js";

const COMMIT_SEP = "GITFAMILIAR_SEP";

/**
 * Get all unique contributors from git history.
 * Returns deduplicated list of UserIdentity, sorted by commit count descending.
 */
export async function getAllContributors(
  gitClient: GitClient,
  minCommits: number = 1,
): Promise<UserIdentity[]> {
  const output = await gitClient.getLog([
    "--all",
    `--format=%aN|%aE`,
  ]);

  const counts = new Map<string, { name: string; email: string; count: number }>();

  for (const line of output.trim().split("\n")) {
    if (!line.includes("|")) continue;
    const [name, email] = line.split("|", 2);
    if (!name || !email) continue;

    const key = email.toLowerCase();
    const existing = counts.get(key);
    if (existing) {
      existing.count++;
    } else {
      counts.set(key, { name: name.trim(), email: email.trim(), count: 1 });
    }
  }

  return Array.from(counts.values())
    .filter((c) => c.count >= minCommits)
    .sort((a, b) => b.count - a.count)
    .map((c) => ({ name: c.name, email: c.email }));
}

/**
 * Bulk get file → contributors mapping from a single git log call.
 * Much faster than per-file git log queries.
 */
export async function bulkGetFileContributors(
  gitClient: GitClient,
  trackedFiles: Set<string>,
): Promise<Map<string, Set<string>>> {
  const output = await gitClient.getLog([
    "--all",
    "--name-only",
    `--format=${COMMIT_SEP}%aN|%aE`,
  ]);

  const result = new Map<string, Set<string>>();

  let currentAuthor = "";
  for (const line of output.split("\n")) {
    if (line.startsWith(COMMIT_SEP)) {
      const parts = line.slice(COMMIT_SEP.length).split("|", 2);
      currentAuthor = parts[0]?.trim() || "";
      continue;
    }

    const filePath = line.trim();
    if (!filePath || !currentAuthor) continue;
    if (!trackedFiles.has(filePath)) continue;

    let contributors = result.get(filePath);
    if (!contributors) {
      contributors = new Set<string>();
      result.set(filePath, contributors);
    }
    contributors.add(currentAuthor);
  }

  return result;
}
