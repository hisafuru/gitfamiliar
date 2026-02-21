import type {
  ReviewerSuggestion,
  ScoringMode,
  CliOptions,
} from "../core/types.js";
import type { GitClient } from "../git/client.js";
import { getAllContributors } from "../git/contributors.js";
import { computeFamiliarity } from "../core/familiarity.js";
import { walkFiles } from "../core/file-tree.js";
import { processBatch } from "../utils/batch.js";

export async function suggestReviewers(
  gitClient: GitClient,
  changedFiles: string[],
  prAuthor: string,
  mode: ScoringMode,
  count: number,
  repoPath: string,
): Promise<ReviewerSuggestion[]> {
  // Get all contributors, exclude PR author
  const contributors = await getAllContributors(gitClient, 3);
  const candidates = contributors.filter(
    (c) =>
      c.name.toLowerCase() !== prAuthor.toLowerCase() &&
      c.email.toLowerCase() !== prAuthor.toLowerCase(),
  );

  if (candidates.length === 0) return [];

  // Calculate each candidate's familiarity with changed files
  const suggestions: ReviewerSuggestion[] = [];

  await processBatch(
    candidates.slice(0, 20), // Limit to top 20 most active contributors
    async (candidate) => {
      const options: CliOptions = {
        mode,
        user: candidate.name,
        filter: "all",
        expiration: { policy: "never" },
        html: false,
        weights: { blame: 0.5, commit: 0.35, review: 0.15 },
        repoPath,
      };

      try {
        const result = await computeFamiliarity(options);

        const fileScores = new Map<string, number>();
        walkFiles(result.tree, (file) => {
          if (changedFiles.includes(file.path)) {
            fileScores.set(file.path, file.score);
          }
        });

        const relevantFiles = changedFiles.filter(
          (f) => (fileScores.get(f) || 0) > 0.3,
        );

        if (relevantFiles.length === 0) return;

        const totalScore = changedFiles.reduce(
          (sum, f) => sum + (fileScores.get(f) || 0),
          0,
        );
        const avgFamiliarity = totalScore / changedFiles.length;

        suggestions.push({
          user: candidate,
          relevantFiles,
          avgFamiliarity,
        });
      } catch {
        // Skip users that fail scoring
      }
    },
    3,
  );

  // Sort by average familiarity, take top N
  return suggestions
    .sort((a, b) => b.avgFamiliarity - a.avgFamiliarity)
    .slice(0, count);
}
