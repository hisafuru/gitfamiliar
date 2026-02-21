import chalk from "chalk";
import type {
  TeamCoverageResult,
  CoverageFolderScore,
  CoverageFileScore,
} from "../../core/types.js";

function riskBadge(level: string): string {
  switch (level) {
    case "risk":
      return chalk.bgRed.white(" RISK ");
    case "moderate":
      return chalk.bgYellow.black(" MOD  ");
    case "safe":
      return chalk.bgGreen.black(" SAFE ");
    default:
      return level;
  }
}

function riskColor(level: string): typeof chalk {
  switch (level) {
    case "risk":
      return chalk.red;
    case "moderate":
      return chalk.yellow;
    default:
      return chalk.green;
  }
}

function renderFolder(
  node: CoverageFolderScore,
  indent: number,
  maxDepth: number,
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
      const color = riskColor(child.riskLevel);
      lines.push(
        `${prefix}${chalk.bold(name.padEnd(24))} ${String(child.avgContributors).padStart(4)} avg    ${String(child.busFactor).padStart(2)}       ${riskBadge(child.riskLevel)}`,
      );
      if (indent < maxDepth) {
        lines.push(...renderFolder(child, indent + 1, maxDepth));
      }
    }
  }

  return lines;
}

export function renderCoverageTerminal(result: TeamCoverageResult): void {
  console.log("");
  console.log(
    chalk.bold(
      `GitFamiliar \u2014 Team Coverage (${result.totalFiles} files, ${result.totalContributors} contributors)`,
    ),
  );
  console.log("");

  // Overall bus factor
  const bfColor =
    result.overallBusFactor <= 1
      ? chalk.red
      : result.overallBusFactor <= 2
        ? chalk.yellow
        : chalk.green;
  console.log(`Overall Bus Factor: ${bfColor.bold(String(result.overallBusFactor))}`);
  console.log("");

  // Risk files
  if (result.riskFiles.length > 0) {
    console.log(chalk.red.bold(`Risk Files (0-1 contributors):`));
    const displayFiles = result.riskFiles.slice(0, 20);
    for (const file of displayFiles) {
      const count = file.contributorCount;
      const names = file.contributors.join(", ");
      const label =
        count === 0
          ? chalk.red("0 people")
          : chalk.yellow(`1 person  (${names})`);
      console.log(`  ${file.path.padEnd(40)} ${label}`);
    }
    if (result.riskFiles.length > 20) {
      console.log(
        chalk.gray(`  ... and ${result.riskFiles.length - 20} more`),
      );
    }
    console.log("");
  } else {
    console.log(chalk.green("No high-risk files found."));
    console.log("");
  }

  // Folder coverage table
  console.log(chalk.bold("Folder Coverage:"));
  console.log(
    chalk.gray(
      `  ${"Folder".padEnd(24)} ${"Avg Contrib".padStart(11)}  ${"Bus Factor".padStart(10)}   Risk`,
    ),
  );

  const folderLines = renderFolder(result.tree, 1, 2);
  for (const line of folderLines) {
    console.log(line);
  }

  console.log("");
}
