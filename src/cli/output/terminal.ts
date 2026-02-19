import chalk from 'chalk';
import type { FamiliarityResult } from '../../core/familiarity.js';
import type { FolderScore, FileScore, TreeNode } from '../../core/types.js';

const BAR_WIDTH = 10;
const FILLED_CHAR = '\u2588'; // █
const EMPTY_CHAR = '\u2591';  // ░

function makeBar(score: number): string {
  const filled = Math.round(score * BAR_WIDTH);
  const empty = BAR_WIDTH - filled;
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
    case 'binary': return 'Binary mode';
    case 'authorship': return 'Authorship mode';
    case 'review-coverage': return 'Review Coverage mode';
    case 'weighted': return 'Weighted mode';
    default: return mode;
  }
}

function renderFolder(
  node: FolderScore,
  indent: number,
  mode: string,
  maxDepth: number,
): string[] {
  const lines: string[] = [];
  const prefix = '  '.repeat(indent);

  // Sort children: folders first, then files, by name
  const sorted = [...node.children].sort((a, b) => {
    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
    return a.path.localeCompare(b.path);
  });

  for (const child of sorted) {
    if (child.type === 'folder') {
      const folder = child as FolderScore;
      const name = folder.path.split('/').pop() + '/';
      const bar = makeBar(folder.score);
      const pct = formatPercent(folder.score);

      if (mode === 'binary') {
        const readCount = folder.readCount || 0;
        lines.push(
          `${prefix}${chalk.bold(name.padEnd(16))} ${bar}  ${pct.padStart(4)} (${readCount}/${folder.fileCount} files)`,
        );
      } else {
        lines.push(
          `${prefix}${chalk.bold(name.padEnd(16))} ${bar}  ${pct.padStart(4)}`,
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

  console.log('');
  console.log(chalk.bold(`GitFamiliar \u2014 ${repoName} (${getModeLabel(mode)})`));
  console.log('');

  if (mode === 'binary') {
    const readCount = tree.readCount || 0;
    const pct = formatPercent(tree.score);
    console.log(`Overall: ${readCount}/${tree.fileCount} files (${pct})`);
  } else {
    const pct = formatPercent(tree.score);
    console.log(`Overall: ${pct}`);
  }

  console.log('');

  const folderLines = renderFolder(tree, 1, mode, 2);
  for (const line of folderLines) {
    console.log(line);
  }

  console.log('');

  if (mode === 'binary') {
    const { writtenCount, reviewedCount, bothCount } = result;
    console.log(
      `Written: ${writtenCount} files | Reviewed: ${reviewedCount} files | Both: ${bothCount} files`,
    );
    console.log('');
  }
}
