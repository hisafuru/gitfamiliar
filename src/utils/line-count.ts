import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Count lines in a file. Returns 0 for binary or unreadable files.
 */
export function countLines(repoRoot: string, filePath: string): number {
  try {
    const fullPath = join(repoRoot, filePath);
    const content = readFileSync(fullPath, 'utf-8');
    if (content.length === 0) return 0;
    return content.split('\n').length;
  } catch {
    return 0;
  }
}
