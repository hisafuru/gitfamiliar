import chalk from "chalk";

const FILLED_CHAR = "\u2588"; // █
const EMPTY_CHAR = "\u2591"; // ░

export function makeBar(
  score: number,
  width: number = 10,
): string {
  const filled = Math.round(score * width);
  const empty = width - filled;
  const bar = FILLED_CHAR.repeat(filled) + EMPTY_CHAR.repeat(empty);

  if (score >= 0.8) return chalk.green(bar);
  if (score >= 0.5) return chalk.yellow(bar);
  if (score > 0) return chalk.red(bar);
  return chalk.gray(bar);
}

export function formatPercent(score: number): string {
  return `${Math.round(score * 100)}%`;
}

export function getModeLabel(mode: string): string {
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
