import chalk from "chalk";
import type {
  MultiUserResult,
  MultiUserFolderScore,
  UserScore,
} from "../../core/types.js";

const BAR_WIDTH = 20;
const FILLED_CHAR = "\u2588";
const EMPTY_CHAR = "\u2591";

function makeBar(score: number, width: number = BAR_WIDTH): string {
  const filled = Math.round(score * width);
  const empty = width - filled;
  const bar = FILLED_CHAR.repeat(filled) + EMPTY_CHAR.repeat(empty);
  if (score >= 0.8) return chalk.green(bar);
  if (score >= 0.5) return chalk.yellow(bar);
  if (score > 0) return chalk.red(bar);
  return chalk.gray(bar);
}

function formatPercent(score: number): string {
  return `${Math.round(score * 100)}%`;
}

function getModeLabel(mode: string): string {
  switch (mode) {
    case "committed":
      return "Committed mode";
    case "code-coverage":
      return "Code Coverage mode";
    case "weighted":
      return "Weighted mode";
    default:
      return mode;
  }
}

function truncateName(name: string, maxLen: number): string {
  if (name.length <= maxLen) return name;
  return name.slice(0, maxLen - 1) + "\u2026";
}

function renderFolder(
  node: MultiUserFolderScore,
  indent: number,
  maxDepth: number,
  nameWidth: number,
): string[] {
  const lines: string[] = [];

  const sorted = [...node.children].sort((a, b) => {
    if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
    return a.path.localeCompare(b.path);
  });

  for (const child of sorted) {
    if (child.type === "folder") {
      const prefix = "  ".repeat(indent);
      const name = (child.path.split("/").pop() || child.path) + "/";
      const displayName = truncateName(name, nameWidth).padEnd(nameWidth);

      const scores = child.userScores
        .map((s) => formatPercent(s.score).padStart(5))
        .join("  ");

      lines.push(`${prefix}${chalk.bold(displayName)}  ${scores}`);

      if (indent < maxDepth) {
        lines.push(...renderFolder(child, indent + 1, maxDepth, nameWidth));
      }
    }
  }

  return lines;
}

export function renderMultiUserTerminal(result: MultiUserResult): void {
  const { tree, repoName, mode, userSummaries, totalFiles } = result;

  console.log("");
  console.log(
    chalk.bold(
      `GitFamiliar \u2014 ${repoName} (${getModeLabel(mode)}, ${userSummaries.length} users)`,
    ),
  );
  console.log("");

  // Overall per-user stats
  console.log(chalk.bold("Overall:"));
  for (const summary of userSummaries) {
    const name = truncateName(summary.user.name, 14).padEnd(14);
    const bar = makeBar(summary.overallScore);
    const pct = formatPercent(summary.overallScore);

    if (mode === "committed") {
      console.log(
        `  ${name} ${bar}  ${pct.padStart(4)} (${summary.writtenCount}/${totalFiles} files)`,
      );
    } else {
      console.log(`  ${name} ${bar}  ${pct.padStart(4)}`);
    }
  }
  console.log("");

  // Folder breakdown header
  const nameWidth = 20;
  const headerNames = userSummaries
    .map((s) => truncateName(s.user.name, 7).padStart(7))
    .join("  ");
  console.log(chalk.bold("Folders:") + " ".repeat(nameWidth - 4) + headerNames);

  const folderLines = renderFolder(tree, 1, 2, nameWidth);
  for (const line of folderLines) {
    console.log(line);
  }

  console.log("");
}
