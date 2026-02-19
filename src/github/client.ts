import type { ReviewInfo } from '../core/types.js';

interface GitHubPR {
  number: number;
  files: string[];
}

interface GitHubReview {
  state: string;
  submitted_at: string;
}

/**
 * Minimal GitHub client using fetch (no external dependency).
 */
export class GitHubClient {
  private token: string;
  private baseUrl = 'https://api.github.com';

  constructor(token: string) {
    this.token = token;
  }

  private async fetch(path: string): Promise<any> {
    const url = `${this.baseUrl}${path}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'gitfamiliar',
      },
    });

    if (!response.ok) {
      if (response.status === 403) {
        throw new Error('GitHub API rate limit exceeded. Please wait or use a token with higher limits.');
      }
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Parse owner/repo from a git remote URL.
   */
  static parseRemoteUrl(url: string): { owner: string; repo: string } | null {
    // SSH format: git@github.com:owner/repo.git
    let match = url.match(/github\.com[:/]([^/]+)\/([^/.]+)(\.git)?$/);
    if (match) {
      return { owner: match[1], repo: match[2] };
    }
    return null;
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

    // Get PRs reviewed by the user (search API)
    let page = 1;
    const perPage = 100;

    while (true) {
      const searchResult = await this.fetch(
        `/search/issues?q=type:pr+repo:${owner}/${repo}+reviewed-by:${username}&per_page=${perPage}&page=${page}`,
      );

      if (!searchResult.items || searchResult.items.length === 0) break;

      for (const item of searchResult.items) {
        const prNumber = item.number;

        // Get the user's reviews for this PR
        const reviews: GitHubReview[] = await this.fetch(
          `/repos/${owner}/${repo}/pulls/${prNumber}/reviews`,
        );

        const userReviews = reviews.filter(
          (r: any) => r.user?.login?.toLowerCase() === username.toLowerCase(),
        );

        if (userReviews.length === 0) continue;

        // Get files in this PR
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

function mapReviewState(state: string): ReviewInfo['type'] {
  switch (state.toUpperCase()) {
    case 'APPROVED':
      return 'approved';
    case 'CHANGES_REQUESTED':
      return 'changes_requested';
    default:
      return 'commented';
  }
}
