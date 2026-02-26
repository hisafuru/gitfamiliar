import chalk from "chalk";
import type {
  MultiUserResult,
  MultiUserFolderScore,
  UserScore,
} from "../../core/types.js";
import { makeBar, formatPercent, getModeLabel } from "./terminal-utils.js";

const BAR_WIDTH = 20;

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
    const bar = makeBar(summary.overallScore, BAR_WIDTH);
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
