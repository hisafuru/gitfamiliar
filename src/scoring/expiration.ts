import type { ExpirationConfig, UserIdentity } from "../core/types.js";
import type { GitClient } from "../git/client.js";
import { getLastCommitDate } from "../git/log.js";
import { getLastTouchCommit, getChangeRatio } from "../git/diff.js";
import { processBatch } from "../utils/batch.js";

/**
 * Parse an expiration string from CLI into ExpirationConfig.
 * Formats: "never", "time:180d", "change:50%", "combined:365d:50%"
 */
export function parseExpirationConfig(input: string): ExpirationConfig {
  if (!input || input === "never") {
    return { policy: "never" };
  }

  if (input.startsWith("time:")) {
    const duration = parseDays(input.slice("time:".length));
    return { policy: "time", duration };
  }

  if (input.startsWith("change:")) {
    const threshold = parsePercentage(input.slice("change:".length));
    return { policy: "change", threshold };
  }

  if (input.startsWith("combined:")) {
    const parts = input.slice("combined:".length).split(":");
    const duration = parseDays(parts[0]);
    const threshold = parts[1] ? parsePercentage(parts[1]) : 0.5;
    return { policy: "combined", duration, threshold };
  }

  return { policy: "never" };
}

function parseDays(s: string): number {
  const match = s.match(/^(\d+)d$/);
  if (!match)
    throw new Error(
      `Invalid duration format: "${s}". Expected format like "180d".`,
    );
  return parseInt(match[1], 10);
}

function parsePercentage(s: string): number {
  const match = s.match(/^(\d+)%$/);
  if (!match)
    throw new Error(
      `Invalid percentage format: "${s}". Expected format like "50%".`,
    );
  return parseInt(match[1], 10) / 100;
}

/**
 * Check if a file's familiarity has expired according to the given policy.
 */
export async function isExpired(
  gitClient: GitClient,
  filePath: string,
  user: UserIdentity,
  config: ExpirationConfig,
  now?: Date,
): Promise<boolean> {
  if (config.policy === "never") return false;

  const currentDate = now || new Date();
  const email = user.email || user.name;

  if (config.policy === "time" || config.policy === "combined") {
    const lastTouch = await getLastCommitDate(gitClient, user, filePath);
    if (lastTouch && config.duration) {
      const daysSince =
        (currentDate.getTime() - lastTouch.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince > config.duration) return true;
    }
  }

  if (config.policy === "change" || config.policy === "combined") {
    const lastCommit = await getLastTouchCommit(gitClient, filePath, email);
    if (lastCommit && config.threshold) {
      const ratio = await getChangeRatio(gitClient, filePath, lastCommit);
      if (ratio > config.threshold) return true;
    }
  }

  return false;
}

/**
 * Get the set of expired files for a given user and config.
 */
export async function getExpiredFiles(
  gitClient: GitClient,
  files: string[],
  user: UserIdentity,
  config: ExpirationConfig,
): Promise<Set<string>> {
  if (config.policy === "never") return new Set();

  const expiredSet = new Set<string>();

  await processBatch(files, async (filePath) => {
    if (await isExpired(gitClient, filePath, user, config)) {
      expiredSet.add(filePath);
    }
  });

  return expiredSet;
}
