import { describe, it, expect } from "vitest";
import {
  walkFiles,
  recomputeFolderScores,
} from "../../../src/core/file-tree.js";
import type { FileScore, FolderScore } from "../../../src/core/types.js";

function makeFile(
  path: string,
  lines: number = 100,
  score: number = 0,
): FileScore {
  return { type: "file", path, lines, score };
}

function makeFolder(
  path: string,
  children: (FileScore | FolderScore)[],
): FolderScore {
  return {
    type: "folder",
    path,
    lines: 0,
    score: 0,
    fileCount: 0,
    children,
  };
}

describe("walkFiles", () => {
  it("visits all files in a flat folder", () => {
    const files = [makeFile("a.ts"), makeFile("b.ts")];
    const tree = makeFolder("", files);
    const visited: string[] = [];
    walkFiles(tree, (f) => visited.push(f.path));
    expect(visited).toEqual(["a.ts", "b.ts"]);
  });

  it("visits files in nested folders", () => {
    const inner = makeFolder("src", [makeFile("src/a.ts")]);
    const tree = makeFolder("", [inner, makeFile("b.ts")]);
    const visited: string[] = [];
    walkFiles(tree, (f) => visited.push(f.path));
    expect(visited).toEqual(["src/a.ts", "b.ts"]);
  });

  it("visits a single file node", () => {
    const file = makeFile("a.ts");
    const visited: string[] = [];
    walkFiles(file, (f) => visited.push(f.path));
    expect(visited).toEqual(["a.ts"]);
  });

  it("handles empty folder", () => {
    const tree = makeFolder("", []);
    const visited: string[] = [];
    walkFiles(tree, (f) => visited.push(f.path));
    expect(visited).toEqual([]);
  });
});

describe("recomputeFolderScores", () => {
  describe("committed mode", () => {
    it("computes score as readCount / fileCount", () => {
      const files = [
        makeFile("a.ts", 100, 1),
        makeFile("b.ts", 100, 0),
        makeFile("c.ts", 100, 1),
      ];
      const tree = makeFolder("", files);
      tree.fileCount = 3;

      recomputeFolderScores(tree, "committed");
      expect(tree.score).toBeCloseTo(2 / 3, 5);
      expect(tree.readCount).toBe(2);
      expect(tree.fileCount).toBe(3);
    });

    it("handles nested folders", () => {
      const inner = makeFolder("src", [
        makeFile("src/a.ts", 100, 1),
        makeFile("src/b.ts", 100, 1),
      ]);
      const tree = makeFolder("", [inner, makeFile("c.ts", 100, 0)]);

      recomputeFolderScores(tree, "committed");
      expect(inner.score).toBeCloseTo(1.0, 5);
      expect(inner.readCount).toBe(2);
      expect(tree.score).toBeCloseTo(2 / 3, 5);
      expect(tree.readCount).toBe(2);
      expect(tree.fileCount).toBe(3);
    });

    it("returns 0 for empty folder", () => {
      const tree = makeFolder("", []);
      recomputeFolderScores(tree, "committed");
      expect(tree.score).toBe(0);
      expect(tree.fileCount).toBe(0);
    });
  });

  describe("continuous mode", () => {
    it("computes weighted average by line count", () => {
      const files = [
        makeFile("a.ts", 200, 0.8), // 200 * 0.8 = 160
        makeFile("b.ts", 100, 0.2), // 100 * 0.2 = 20
      ];
      const tree = makeFolder("", files);

      recomputeFolderScores(tree, "continuous");
      // (160 + 20) / 300 = 0.6
      expect(tree.score).toBeCloseTo(0.6, 5);
    });

    it("handles nested folders with line-weighted scores", () => {
      const inner = makeFolder("src", [
        makeFile("src/a.ts", 100, 1.0),
        makeFile("src/b.ts", 100, 0.0),
      ]);
      const tree = makeFolder("", [inner, makeFile("c.ts", 200, 0.5)]);

      recomputeFolderScores(tree, "continuous");
      // inner: (100 + 0) / 200 = 0.5
      expect(inner.score).toBeCloseTo(0.5, 5);
      // tree: (100 + 0 + 100) / 400 = 0.25... wait
      // inner contributes: 0.5 * 200 = 100
      // c.ts contributes: 0.5 * 200 = 100
      // total: 200 / 400 = 0.5
      expect(tree.score).toBeCloseTo(0.5, 5);
    });
  });
});
