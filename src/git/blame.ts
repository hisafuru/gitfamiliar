import type { GitClient } from "./client.js";
import type { UserIdentity } from "../core/types.js";
import { matchesUser } from "./identity.js";

export interface BlameEntry {
  email: string;
  name: string;
  lines: number;
}

export interface BlameResult {
  entries: BlameEntry[];
  totalLines: number;
}

/**
 * Run git blame on a file and return per-author line counts.
 * Uses -w to ignore whitespace changes.
 */
export async function getBlameData(
  gitClient: GitClient,
  filePath: string,
): Promise<BlameResult> {
  const authorMap = new Map<string, BlameEntry>();
  let totalLines = 0;

  try {
    const output = await gitClient.blame(filePath, ["-w", "--porcelain"]);
    const lines = output.split("\n");

    let currentName = "";
    let currentEmail = "";

    for (const line of lines) {
      if (line.startsWith("author ")) {
        currentName = line.slice("author ".length).trim();
      } else if (line.startsWith("author-mail ")) {
        currentEmail = line
          .slice("author-mail ".length)
          .replace(/[<>]/g, "")
          .trim();
      } else if (line.startsWith("\t")) {
        // Content line - count for current author
        if (currentEmail || currentName) {
          totalLines++;
          const key = `${currentEmail}|${currentName}`;
          const existing = authorMap.get(key);
          if (existing) {
            existing.lines++;
          } else {
            authorMap.set(key, {
              email: currentEmail,
              name: currentName,
              lines: 1,
            });
          }
        }
      }
    }
  } catch {
    // Binary file or other error - return empty
  }

  return { entries: Array.from(authorMap.values()), totalLines };
}

/**
 * Get the number of lines authored by a specific user in a file.
 */
export async function getUserBlameLines(
  gitClient: GitClient,
  filePath: string,
  user: UserIdentity,
): Promise<{ userLines: number; totalLines: number }> {
  const { entries, totalLines } = await getBlameData(gitClient, filePath);

  let userLines = 0;
  for (const entry of entries) {
    if (matchesUser(entry.name, entry.email, user)) {
      userLines += entry.lines;
    }
  }

  return { userLines, totalLines };
}
