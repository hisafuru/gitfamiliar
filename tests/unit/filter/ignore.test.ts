import { describe, it, expect } from 'vitest';
import { createFilter } from '../../../src/filter/ignore.js';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('createFilter', () => {
  it('excludes default patterns when no .gitfamiliarignore exists', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'gf-test-'));
    const filter = createFilter(tempDir);

    // Should be excluded by defaults
    expect(filter('package-lock.json')).toBe(false);
    expect(filter('yarn.lock')).toBe(false);
    expect(filter('dist/bundle.js')).toBe(false);
    expect(filter('something.min.js')).toBe(false);

    // Should be included
    expect(filter('src/index.ts')).toBe(true);
    expect(filter('README.md')).toBe(true);
  });

  it('uses custom .gitfamiliarignore when present', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'gf-test-'));
    writeFileSync(join(tempDir, '.gitfamiliarignore'), '*.test.ts\ndocs/\n');
    const filter = createFilter(tempDir);

    expect(filter('foo.test.ts')).toBe(false);
    expect(filter('docs/README.md')).toBe(false);
    expect(filter('src/index.ts')).toBe(true);
    // Custom ignore doesn't include defaults
    expect(filter('package-lock.json')).toBe(true);
  });
});
