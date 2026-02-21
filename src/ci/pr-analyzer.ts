import type {
  CliOptions,
  ScoringMode,
  PRAnalysisResult,
  RiskLevel,
  ReviewerSuggestion,
  UserIdentity,
} from "../core/types.js";
import { GitClient } from "../git/client.js";
import { computeFamiliarity } from "../core/familiarity.js";
import { walkFiles } from "../core/file-tree.js";
import { suggestReviewers } from "./reviewer-suggestion.js";

export async function analyzePR(
  repoPath: string,
  prNumber: number,
  changedFiles: string[],
  prAuthor: string,
  mode: ScoringMode,
  threshold: number,
  reviewerCount: number,
): Promise<PRAnalysisResult> {
  const options: CliOptions = {
    mode,
    user: prAuthor,
    filter: "all",
    expiration: { policy: "never" },
    html: false,
    weights: { blame: 0.5, commit: 0.35, review: 0.15 },
    repoPath,
  };

  const result = await computeFamiliarity(options);

  // Extract scores for changed files
  const familiarityScores = new Map<string, number>();
  walkFiles(result.tree, (file) => {
    if (changedFiles.includes(file.path)) {
      familiarityScores.set(file.path, file.score);
    }
  });

  // Files not in tree get score 0
  for (const file of changedFiles) {
    if (!familiarityScores.has(file)) {
      familiarityScores.set(file, 0);
    }
  }

  // Identify unfamiliar files
  const thresholdDecimal = threshold / 100;
  const unfamiliarFiles = changedFiles.filter(
    (f) => (familiarityScores.get(f) || 0) < thresholdDecimal,
  );

  // Determine risk level
  const unfamiliarRatio = unfamiliarFiles.length / changedFiles.length;
  let riskLevel: RiskLevel;
  if (unfamiliarRatio >= 0.5) {
    riskLevel = "risk";
  } else if (unfamiliarRatio >= 0.2) {
    riskLevel = "moderate";
  } else {
    riskLevel = "safe";
  }

  // Get reviewer suggestions
  const gitClient = new GitClient(repoPath);
  const suggestedReviewers = await suggestReviewers(
    gitClient,
    changedFiles,
    prAuthor,
    mode,
    reviewerCount,
    repoPath,
  );

  return {
    prNumber,
    author: prAuthor,
    changedFiles,
    familiarityScores,
    unfamiliarFiles,
    suggestedReviewers,
    riskLevel,
  };
}
