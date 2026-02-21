import type { ReviewInfo } from "../core/types.js";

interface GitHubReview {
  state: string;
  submitted_at: string;
}

export interface GitHubRemoteInfo {
  hostname: string; // e.g. "github.com" or "ghe.example.com"
  owner: string;
  repo: string;
  apiBaseUrl: string; // e.g. "https://api.github.com" or "https://ghe.example.com/api/v3"
}

/**
 * Minimal GitHub client using fetch (no external dependency).
 * Supports both github.com and GitHub Enterprise.
 */
export class GitHubClient {
  private token: string;
  private baseUrl: string;

  constructor(token: string, apiBaseUrl: string = "https://api.github.com") {
    this.token = token;
    this.baseUrl = apiBaseUrl.replace(/\/+$/, "");
  }

  private async fetch(path: string): Promise<any> {
    const url = `${this.baseUrl}${path}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "gitfamiliar",
      },
    });

    if (!response.ok) {
      if (response.status === 403) {
        throw new Error(
          "GitHub API rate limit exceeded. Please wait or use a token with higher limits.",
        );
      }
      throw new Error(
        `GitHub API error: ${response.status} ${response.statusText}`,
      );
    }

    return response.json();
  }

  /**
   * Verify API connectivity by fetching the authenticated user.
   */
  async verifyConnection(): Promise<{ login: string; name: string | null }> {
    const user = await this.fetch("/user");
    return { login: user.login, name: user.name };
  }

  /**
   * Parse owner/repo/hostname from a git remote URL.
   * Supports github.com and GitHub Enterprise hosts.
   */
  static parseRemoteUrl(
    url: string,
    overrideHostname?: string,
  ): GitHubRemoteInfo | null {
    let hostname: string;
    let owner: string;
    let repo: string;

    // SSH format: git@hostname:owner/repo.git
    let match = url.match(/git@([^:]+):([^/]+)\/([^/.]+)(\.git)?$/);
    if (match) {
      hostname = match[1];
      owner = match[2];
      repo = match[3];
    } else if (
      // SSH URL format: ssh://git@hostname(:port)?/owner/repo.git
      (match = url.match(
        /ssh:\/\/[^@]+@([^:/]+)(?::\d+)?\/([^/]+)\/([^/.]+?)(\.git)?$/,
      ))
    ) {
      hostname = match[1];
      owner = match[2];
      repo = match[3];
    } else if (
      // HTTPS format: https://hostname(:port)?/owner/repo.git
      (match = url.match(
        /https?:\/\/([^/:]+)(?::\d+)?\/([^/]+)\/([^/.]+?)(\.git)?$/,
      ))
    ) {
      hostname = match[1];
      owner = match[2];
      repo = match[3];
    } else {
      return null;
    }

    if (overrideHostname) {
      hostname = overrideHostname;
    }

    const apiBaseUrl =
      hostname === "github.com"
        ? "https://api.github.com"
        : `https://${hostname}/api/v3`;

    return { hostname, owner, repo, apiBaseUrl };
  }

  /**
   * Get all files reviewed by a user across all PRs they reviewed.
   */
  async getReviewedFiles(
    owner: string,
    repo: string,
    username: string,
  ): Promise<Map<string, ReviewInfo[]>> {
    const reviewedFiles = new Map<string, ReviewInfo[]>();

    let page = 1;
    const perPage = 100;

    while (true) {
      const searchResult = await this.fetch(
        `/search/issues?q=type:pr+repo:${owner}/${repo}+reviewed-by:${username}&per_page=${perPage}&page=${page}`,
      );

      if (!searchResult.items || searchResult.items.length === 0) break;

      for (const item of searchResult.items) {
        const prNumber = item.number;

        const reviews: GitHubReview[] = await this.fetch(
          `/repos/${owner}/${repo}/pulls/${prNumber}/reviews`,
        );

        const userReviews = reviews.filter(
          (r: any) => r.user?.login?.toLowerCase() === username.toLowerCase(),
        );

        if (userReviews.length === 0) continue;

        const prFiles: any[] = await this.fetch(
          `/repos/${owner}/${repo}/pulls/${prNumber}/files?per_page=100`,
        );

        const fileCount = prFiles.length;

        for (const review of userReviews) {
          const reviewType = mapReviewState(review.state);
          const reviewDate = new Date(review.submitted_at);

          for (const prFile of prFiles) {
            const filePath = prFile.filename;
            const info: ReviewInfo = {
              date: reviewDate,
              type: reviewType,
              filesInPR: fileCount,
            };

            if (reviewedFiles.has(filePath)) {
              reviewedFiles.get(filePath)!.push(info);
            } else {
              reviewedFiles.set(filePath, [info]);
            }
          }
        }
      }

      if (searchResult.items.length < perPage) break;
      page++;
    }

    return reviewedFiles;
  }
}

function mapReviewState(state: string): ReviewInfo["type"] {
  switch (state.toUpperCase()) {
    case "APPROVED":
      return "approved";
    case "CHANGES_REQUESTED":
      return "changes_requested";
    default:
      return "commented";
  }
}
