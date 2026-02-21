import { describe, it, expect } from "vitest";
import { calculateBusFactor } from "../../../src/core/team-coverage.js";

describe("calculateBusFactor", () => {
  it("returns 0 for empty map", () => {
    expect(calculateBusFactor(new Map())).toBe(0);
  });

  it("returns 1 when one person covers all files", () => {
    const map = new Map<string, Set<string>>([
      ["a.ts", new Set(["Alice"])],
      ["b.ts", new Set(["Alice"])],
      ["c.ts", new Set(["Alice"])],
      ["d.ts", new Set(["Alice"])],
    ]);
    expect(calculateBusFactor(map)).toBe(1);
  });

  it("returns 1 when two people each cover half, but one covers >50%", () => {
    const map = new Map<string, Set<string>>([
      ["a.ts", new Set(["Alice"])],
      ["b.ts", new Set(["Alice"])],
      ["c.ts", new Set(["Alice"])],
      ["d.ts", new Set(["Bob"])],
    ]);
    // Alice covers 3/4 files. Target is ceil(4*0.5) = 2. Alice alone covers 3 >= 2.
    expect(calculateBusFactor(map)).toBe(1);
  });

  it("returns 2 when no single person covers >50%", () => {
    const map = new Map<string, Set<string>>([
      ["a.ts", new Set(["Alice"])],
      ["b.ts", new Set(["Bob"])],
      ["c.ts", new Set(["Charlie"])],
      ["d.ts", new Set(["Dave"])],
    ]);
    // Target = ceil(4*0.5) = 2. Need 2 people to cover 2 files.
    expect(calculateBusFactor(map)).toBe(2);
  });

  it("handles overlapping contributors correctly", () => {
    const map = new Map<string, Set<string>>([
      ["a.ts", new Set(["Alice", "Bob"])],
      ["b.ts", new Set(["Alice", "Bob"])],
      ["c.ts", new Set(["Bob", "Charlie"])],
      ["d.ts", new Set(["Charlie"])],
      ["e.ts", new Set(["Dave"])],
      ["f.ts", new Set(["Dave"])],
    ]);
    // Target = ceil(6*0.5) = 3.
    // Bob covers a,b,c (3 files). Already >= 3.
    expect(calculateBusFactor(map)).toBe(1);
  });

  it("handles single file", () => {
    const map = new Map<string, Set<string>>([
      ["a.ts", new Set(["Alice"])],
    ]);
    // Target = ceil(1*0.5) = 1. Alice covers 1 >= 1.
    expect(calculateBusFactor(map)).toBe(1);
  });

  it("handles files with no contributors", () => {
    const map = new Map<string, Set<string>>([
      ["a.ts", new Set()],
      ["b.ts", new Set()],
    ]);
    // No one covers any file. Target = 1. Returns 0.
    expect(calculateBusFactor(map)).toBe(0);
  });
});
