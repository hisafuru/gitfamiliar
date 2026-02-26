import { describe, it, expect } from "vitest";
import { scoreCommitted } from "../../../src/scoring/committed.js";
import type { FolderScore, FileScore } from "../../../src/core/types.js";

function makeFile(path: string, lines: number = 100): FileScore {
  return { type: "file", path, lines, score: 0 };
}

function makeTree(files: FileScore[]): FolderScore {
  return {
    type: "folder",
    path: "",
    lines: files.reduce((s, f) => s + f.lines, 0),
    score: 0,
    fileCount: files.length,
    children: files,
  };
}

describe("scoreCommitted", () => {
  it("scores all files as unread when no commits", () => {
    const files = [makeFile("a.ts"), makeFile("b.ts")];
    const tree = makeTree(files);
    scoreCommitted(tree, new Set());

    expect(tree.score).toBe(0);
    expect(tree.readCount).toBe(0);
    expect(files[0].score).toBe(0);
    expect(files[1].score).toBe(0);
  });

  it("scores written files as read", () => {
    const files = [makeFile("a.ts"), makeFile("b.ts"), makeFile("c.ts")];
    const tree = makeTree(files);
    scoreCommitted(tree, new Set(["a.ts", "b.ts"]));

    expect(tree.score).toBeCloseTo(2 / 3, 5);
    expect(tree.readCount).toBe(2);
    expect(files[0].score).toBe(1);
    expect(files[0].isWritten).toBe(true);
    expect(files[2].score).toBe(0);
  });

  it("handles expired files", () => {
    const files = [makeFile("a.ts"), makeFile("b.ts")];
    const tree = makeTree(files);
    scoreCommitted(tree, new Set(["a.ts", "b.ts"]), new Set(["a.ts"]));

    expect(files[0].score).toBe(0);
    expect(files[0].isExpired).toBe(true);
    expect(files[1].score).toBe(1);
  });
});
