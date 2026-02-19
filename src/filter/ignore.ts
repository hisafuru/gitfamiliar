import ignore from 'ignore';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { DEFAULT_IGNORE_PATTERNS } from './defaults.js';

export type FileFilter = (filePath: string) => boolean;

/**
 * Create a file filter based on .gitfamiliarignore patterns.
 * Returns a function that returns true if the file should be INCLUDED.
 */
export function createFilter(repoRoot: string): FileFilter {
  const ig = ignore();

  const ignorePath = join(repoRoot, '.gitfamiliarignore');

  if (existsSync(ignorePath)) {
    const content = readFileSync(ignorePath, 'utf-8');
    ig.add(content);
  } else {
    ig.add(DEFAULT_IGNORE_PATTERNS);
  }

  return (filePath: string) => !ig.ignores(filePath);
}
