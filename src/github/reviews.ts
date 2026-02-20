import type { ReviewInfo } from "../core/types.js";
import type { GitClient } from "../git/client.js";
import { GitHubClient } from "./client.js";
import { resolveGitHubToken } from "./auth.js";

/**
 * Attempt to fetch review data from GitHub.
 * Returns null if no token or not a GitHub repo.
 */
export async function fetchReviewData(
  gitClient: GitClient,
  username?: string,
): Promise<{
  reviewedFiles: Map<string, ReviewInfo[]>;
  reviewedFileSet: Set<string>;
} | null> {
  const token = resolveGitHubToken();
  if (!token) return null;

  const remoteUrl = await gitClient.getRemoteUrl();
  if (!remoteUrl) return null;

  const parsed = GitHubClient.parseRemoteUrl(remoteUrl);
  if (!parsed) return null;

  // GitHub username is required for review API queries
  if (!username) return null;
  const ghUsername = username;

  try {
    const githubClient = new GitHubClient(token);
    const reviewedFiles = await githubClient.getReviewedFiles(
      parsed.owner,
      parsed.repo,
      ghUsername,
    );

    const reviewedFileSet = new Set(reviewedFiles.keys());

    return { reviewedFiles, reviewedFileSet };
  } catch {
    return null;
  }
}
