import chalk from "chalk";
import type { FamiliarityResult } from "../../core/familiarity.js";
import type { FolderScore, FileScore, TreeNode } from "../../core/types.js";
import { makeBar, formatPercent, getModeLabel } from "./terminal-utils.js";

const NAME_COLUMN_WIDTH = 24; // total width for indent + folder name

function renderFolder(
  node: FolderScore,
  indent: number,
  mode: string,
  maxDepth: number,
): string[] {
  const lines: string[] = [];
  const prefix = "  ".repeat(indent);
  const prefixWidth = indent * 2;

  // Sort children: folders first, then files, by name
  const sorted = [...node.children].sort((a, b) => {
    if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
    return a.path.localeCompare(b.path);
  });

  for (const child of sorted) {
    if (child.type === "folder") {
      const folder = child as FolderScore;
      const name = folder.path.split("/").pop() + "/";
      const bar = makeBar(folder.score);
      const pct = formatPercent(folder.score);
      const padWidth = Math.max(
        1,
        NAME_COLUMN_WIDTH - prefixWidth - name.length,
      );
      const padding = " ".repeat(padWidth);

      if (mode === "committed") {
        const readCount = folder.readCount || 0;
        lines.push(
          `${prefix}${chalk.bold(name)}${padding} ${bar}  ${pct.padStart(4)} (${readCount}/${folder.fileCount} files)`,
        );
      } else {
        lines.push(
          `${prefix}${chalk.bold(name)}${padding} ${bar}  ${pct.padStart(4)}`,
        );
      }

      // Recurse if within depth limit
      if (indent < maxDepth) {
        lines.push(...renderFolder(folder, indent + 1, mode, maxDepth));
      }
    }
  }

  return lines;
}

export function renderTerminal(result: FamiliarityResult): void {
  const { tree, repoName, mode } = result;

  console.log("");
  console.log(
    chalk.bold(`GitFamiliar \u2014 ${repoName} (${getModeLabel(mode)})`),
  );
  console.log("");

  if (mode === "committed") {
    const readCount = tree.readCount || 0;
    const pct = formatPercent(tree.score);
    console.log(`Overall: ${readCount}/${tree.fileCount} files (${pct})`);
  } else {
    const pct = formatPercent(tree.score);
    console.log(`Overall: ${pct}`);
  }

  console.log("");

  const folderLines = renderFolder(tree, 1, mode, 2);
  for (const line of folderLines) {
    console.log(line);
  }

  console.log("");

  if (mode === "committed") {
    const { writtenCount } = result;
    console.log(`Written: ${writtenCount} files`);
    console.log("");
  }
}
