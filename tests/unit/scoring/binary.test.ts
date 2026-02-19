import { describe, it, expect } from 'vitest';
import { scoreBinary } from '../../../src/scoring/binary.js';
import type { FolderScore, FileScore } from '../../../src/core/types.js';

function makeFile(path: string, lines: number = 100): FileScore {
  return { type: 'file', path, lines, score: 0 };
}

function makeTree(files: FileScore[]): FolderScore {
  return {
    type: 'folder',
    path: '',
    lines: files.reduce((s, f) => s + f.lines, 0),
    score: 0,
    fileCount: files.length,
    children: files,
  };
}

describe('scoreBinary', () => {
  it('scores all files as unread when no commits', () => {
    const files = [makeFile('a.ts'), makeFile('b.ts')];
    const tree = makeTree(files);
    scoreBinary(tree, new Set(), new Set(), 'all');

    expect(tree.score).toBe(0);
    expect(tree.readCount).toBe(0);
    expect(files[0].score).toBe(0);
    expect(files[1].score).toBe(0);
  });

  it('scores written files as read', () => {
    const files = [makeFile('a.ts'), makeFile('b.ts'), makeFile('c.ts')];
    const tree = makeTree(files);
    scoreBinary(tree, new Set(['a.ts', 'b.ts']), new Set(), 'all');

    expect(tree.score).toBeCloseTo(2 / 3, 5);
    expect(tree.readCount).toBe(2);
    expect(files[0].score).toBe(1);
    expect(files[0].isWritten).toBe(true);
    expect(files[2].score).toBe(0);
  });

  it('scores reviewed files as read in "all" mode', () => {
    const files = [makeFile('a.ts'), makeFile('b.ts')];
    const tree = makeTree(files);
    scoreBinary(tree, new Set(), new Set(['b.ts']), 'all');

    expect(files[0].score).toBe(0);
    expect(files[1].score).toBe(1);
    expect(files[1].isReviewed).toBe(true);
  });

  it('filters to written only', () => {
    const files = [makeFile('a.ts'), makeFile('b.ts')];
    const tree = makeTree(files);
    scoreBinary(tree, new Set(['a.ts']), new Set(['b.ts']), 'written');

    expect(files[0].score).toBe(1);
    expect(files[1].score).toBe(0); // reviewed but not written
  });

  it('filters to reviewed only', () => {
    const files = [makeFile('a.ts'), makeFile('b.ts')];
    const tree = makeTree(files);
    scoreBinary(tree, new Set(['a.ts']), new Set(['b.ts']), 'reviewed');

    expect(files[0].score).toBe(0); // written but not reviewed-only
    expect(files[1].score).toBe(1);
  });

  it('handles expired files', () => {
    const files = [makeFile('a.ts'), makeFile('b.ts')];
    const tree = makeTree(files);
    scoreBinary(tree, new Set(['a.ts', 'b.ts']), new Set(), 'all', new Set(['a.ts']));

    expect(files[0].score).toBe(0);
    expect(files[0].expired).toBe(true);
    expect(files[1].score).toBe(1);
  });

  it('reviewed file is not counted if also written', () => {
    const files = [makeFile('a.ts')];
    const tree = makeTree(files);
    // a.ts is both written and reviewed
    scoreBinary(tree, new Set(['a.ts']), new Set(['a.ts']), 'reviewed');

    // In reviewed filter mode, written files are excluded
    expect(files[0].isReviewed).toBe(false);
    expect(files[0].score).toBe(0);
  });
});
