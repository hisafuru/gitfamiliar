import type { PRAnalysisResult } from "../core/types.js";

function riskEmoji(level: string): string {
  switch (level) {
    case "risk": return "\u{1F534}";
    case "moderate": return "\u{1F7E1}";
    default: return "\u{1F7E2}";
  }
}

function riskLabel(level: string): string {
  switch (level) {
    case "risk": return "High Risk";
    case "moderate": return "Medium Risk";
    default: return "Low Risk";
  }
}

function statusIcon(score: number, threshold: number): string {
  if (score >= threshold) return "\u2705";
  if (score > 0) return "\u26A0\uFE0F";
  return "\u274C";
}

function statusLabel(score: number, threshold: number): string {
  if (score >= threshold) return "Familiar";
  if (score > 0) return "Some knowledge";
  return "Unfamiliar";
}

export function formatPRComment(
  result: PRAnalysisResult,
  threshold: number,
): string {
  const thresholdDecimal = threshold / 100;
  const lines: string[] = [];

  // Header
  lines.push("## GitFamiliar Analysis");
  lines.push("");

  const emoji = riskEmoji(result.riskLevel);
  const label = riskLabel(result.riskLevel);
  const unfamiliarCount = result.unfamiliarFiles.length;
  const totalCount = result.changedFiles.length;

  if (unfamiliarCount > 0) {
    lines.push(
      `${emoji} **${label}** \u2014 ${unfamiliarCount}/${totalCount} changed files are below ${threshold}% familiarity`,
    );
  } else {
    lines.push(
      `${emoji} **${label}** \u2014 You're familiar with all ${totalCount} changed files`,
    );
  }
  lines.push("");

  // File table
  lines.push("### Changed Files");
  lines.push("");
  lines.push("| File | Familiarity | Status |");
  lines.push("|------|-----------|--------|");

  // Sort: unfamiliar first
  const sortedFiles = [...result.changedFiles].sort((a, b) => {
    const sa = result.familiarityScores.get(a) || 0;
    const sb = result.familiarityScores.get(b) || 0;
    return sa - sb;
  });

  for (const file of sortedFiles) {
    const score = result.familiarityScores.get(file) || 0;
    const pct = `${Math.round(score * 100)}%`;
    const icon = statusIcon(score, thresholdDecimal);
    const status = statusLabel(score, thresholdDecimal);
    lines.push(`| \`${file}\` | ${pct} | ${icon} ${status} |`);
  }
  lines.push("");

  // Unfamiliar files list
  if (result.unfamiliarFiles.length > 0) {
    lines.push(`### \u26A0\uFE0F Unfamiliar Files (${result.unfamiliarFiles.length})`);
    lines.push("");
    lines.push(
      "You haven't written or reviewed these files before:",
    );
    for (const file of result.unfamiliarFiles) {
      lines.push(`- \`${file}\``);
    }
    lines.push("");
  }

  // Reviewer suggestions
  if (result.suggestedReviewers.length > 0) {
    lines.push("### \u{1F465} Suggested Reviewers");
    lines.push("");
    for (let i = 0; i < result.suggestedReviewers.length; i++) {
      const r = result.suggestedReviewers[i];
      const pct = Math.round(r.avgFamiliarity * 100);
      const fileCount = r.relevantFiles.length;
      lines.push(
        `${i + 1}. **${r.user.name}** \u2014 Familiar with ${fileCount}/${totalCount} changed files (avg ${pct}%)`,
      );
    }
    lines.push("");
  }

  // Footer
  lines.push("---");
  lines.push(
    "<sub>Powered by <a href=\"https://github.com/kuze/gitfamiliar\">GitFamiliar</a></sub>",
  );

  return lines.join("\n");
}
