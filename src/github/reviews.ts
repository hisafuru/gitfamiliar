import type { ReviewInfo } from "../core/types.js";
import type { GitClient } from "../git/client.js";
import { GitHubClient } from "./client.js";
import { resolveGitHubToken } from "./auth.js";

/**
 * Attempt to fetch review data from GitHub.
 * Returns null if no token or not a GitHub repo.
 * Supports GitHub Enterprise by auto-detecting the hostname from git remote.
 * @param githubUrl - Optional override for GitHub hostname (e.g. "ghe.example.com")
 */
export async function fetchReviewData(
  gitClient: GitClient,
  username?: string,
  githubUrl?: string,
): Promise<{
  reviewedFiles: Map<string, ReviewInfo[]>;
  reviewedFileSet: Set<string>;
} | null> {
  const remoteUrl = await gitClient.getRemoteUrl();
  if (!remoteUrl) {
    console.error(
      "Warning: No git remote found. Review data will not be available.",
    );
    return null;
  }

  const parsed = GitHubClient.parseRemoteUrl(remoteUrl, githubUrl);
  if (!parsed) {
    console.error(
      "Warning: Could not parse remote URL as a GitHub repository. Review data will not be available.",
    );
    return null;
  }

  const token = resolveGitHubToken(parsed.hostname);
  if (!token) {
    console.error(
      `Warning: No GitHub token found for ${parsed.hostname}. Review data will not be available.\n` +
        `  Run: gh auth login` +
        (parsed.hostname !== "github.com"
          ? ` --hostname ${parsed.hostname}`
          : ""),
    );
    return null;
  }

  const githubClient = new GitHubClient(token, parsed.apiBaseUrl);

  // If no username specified, resolve from GitHub API
  let ghUsername = username;
  if (!ghUsername) {
    try {
      const user = await githubClient.verifyConnection();
      ghUsername = user.login;
    } catch (error: any) {
      console.error(
        `Warning: Could not resolve GitHub username: ${error.message}. Review data will not be available.`,
      );
      return null;
    }
  }

  try {
    const reviewedFiles = await githubClient.getReviewedFiles(
      parsed.owner,
      parsed.repo,
      ghUsername,
    );

    const reviewedFileSet = new Set(reviewedFiles.keys());

    if (reviewedFileSet.size === 0) {
      console.error(
        `Warning: No review data found for user "${ghUsername}" in ${parsed.owner}/${parsed.repo}.`,
      );
    }

    return { reviewedFiles, reviewedFileSet };
  } catch (error: any) {
    console.error(`Warning: Failed to fetch review data: ${error.message}`);
    return null;
  }
}
