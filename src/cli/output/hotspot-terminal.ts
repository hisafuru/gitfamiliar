import chalk from "chalk";
import type { HotspotResult, HotspotRiskLevel } from "../../core/types.js";

function riskBadge(level: HotspotRiskLevel): string {
  switch (level) {
    case "critical":
      return chalk.bgRed.white.bold(" CRIT ");
    case "high":
      return chalk.bgRedBright.white(" HIGH ");
    case "medium":
      return chalk.bgYellow.black("  MED ");
    case "low":
      return chalk.bgGreen.black("  LOW ");
  }
}

function riskColor(level: HotspotRiskLevel): typeof chalk {
  switch (level) {
    case "critical": return chalk.red;
    case "high": return chalk.redBright;
    case "medium": return chalk.yellow;
    case "low": return chalk.green;
  }
}

export function renderHotspotTerminal(result: HotspotResult): void {
  const { files, repoName, hotspotMode, timeWindow, summary, userName } = result;

  console.log("");
  const modeLabel = hotspotMode === "team" ? "Team Hotspots" : "Personal Hotspots";
  const userLabel = userName ? ` (${userName})` : "";
  console.log(
    chalk.bold(`GitFamiliar \u2014 ${modeLabel}${userLabel} \u2014 ${repoName}`),
  );
  console.log(chalk.gray(`  Time window: last ${timeWindow} days`));
  console.log("");

  // Filter to files with actual activity
  const activeFiles = files.filter((f) => f.changeFrequency > 0);

  if (activeFiles.length === 0) {
    console.log(chalk.gray("  No files changed in the time window."));
    console.log("");
    return;
  }

  // Top hotspots table
  const displayCount = Math.min(30, activeFiles.length);
  const topFiles = activeFiles.slice(0, displayCount);

  console.log(
    chalk.gray(
      `  ${"Rank".padEnd(5)} ${"File".padEnd(42)} ${"Familiarity".padStart(11)} ${"Changes".padStart(8)} ${"Risk".padStart(6)}  Level`,
    ),
  );
  console.log(chalk.gray("  " + "\u2500".repeat(90)));

  for (let i = 0; i < topFiles.length; i++) {
    const f = topFiles[i];
    const rank = String(i + 1).padEnd(5);
    const path = truncate(f.path, 42).padEnd(42);
    const fam = `${Math.round(f.familiarity * 100)}%`.padStart(11);
    const changes = String(f.changeFrequency).padStart(8);
    const risk = f.risk.toFixed(2).padStart(6);
    const color = riskColor(f.riskLevel);
    const badge = riskBadge(f.riskLevel);

    console.log(
      `  ${color(rank)}${path} ${fam} ${changes} ${color(risk)}  ${badge}`,
    );
  }

  if (activeFiles.length > displayCount) {
    console.log(
      chalk.gray(`  ... and ${activeFiles.length - displayCount} more files`),
    );
  }

  console.log("");

  // Summary
  console.log(chalk.bold("Summary:"));
  if (summary.critical > 0) {
    console.log(
      `  ${chalk.red.bold(`\u{1F534} Critical Risk: ${summary.critical} files`)}`,
    );
  }
  if (summary.high > 0) {
    console.log(
      `  ${chalk.redBright(`\u{1F7E0} High Risk: ${summary.high} files`)}`,
    );
  }
  if (summary.medium > 0) {
    console.log(
      `  ${chalk.yellow(`\u{1F7E1} Medium Risk: ${summary.medium} files`)}`,
    );
  }
  console.log(
    `  ${chalk.green(`\u{1F7E2} Low Risk: ${summary.low} files`)}`,
  );

  console.log("");
  if (summary.critical > 0 || summary.high > 0) {
    console.log(
      chalk.gray(
        "  Recommendation: Focus code review and knowledge transfer on critical/high risk files.",
      ),
    );
    console.log("");
  }
}

function truncate(s: string, maxLen: number): string {
  if (s.length <= maxLen) return s;
  return s.slice(0, maxLen - 1) + "\u2026";
}
