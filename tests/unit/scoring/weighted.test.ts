import { describe, it, expect } from "vitest";
import {
  sigmoid,
  recencyDecay,
  normalizedDiff,
} from "../../../src/utils/math.js";

describe("Weighted mode numerical example", () => {
  it("blame_score = 30/200 = 0.15", () => {
    const blameScore = 30 / 200;
    expect(blameScore).toBeCloseTo(0.15, 5);
  });

  it("commit_score calculation", () => {
    // commit 1: 10 days ago, +30/-0 lines
    const nd1 = normalizedDiff(30, 0, 200);
    expect(nd1).toBeCloseTo(0.15, 3);

    const sig1 = sigmoid(nd1, 0.3);
    expect(sig1).toBeCloseTo(0.333, 2);

    const decay1 = recencyDecay(10, 180);
    expect(decay1).toBeCloseTo(0.96, 1);

    const contrib1 = sig1 * decay1;

    // commit 2: 45 days ago, +5/-2 lines
    const nd2 = normalizedDiff(5, 2, 200);
    expect(nd2).toBeCloseTo(0.03, 3);

    const sig2 = sigmoid(nd2, 0.3);
    expect(sig2).toBeCloseTo(0.09, 1);

    const decay2 = recencyDecay(45, 180);
    expect(decay2).toBeCloseTo(0.84, 1);

    const commitScore = Math.min(1, contrib1 + sig2 * decay2);
    expect(commitScore).toBeGreaterThan(0);
    expect(commitScore).toBeLessThan(1);
  });

  it("combined score uses correct weights", () => {
    const blameScore = 0.15;
    const commitScore = 0.49;

    const total = 0.5 * blameScore + 0.5 * commitScore;
    // 0.075 + 0.245 = 0.32
    expect(total).toBeCloseTo(0.32, 2);
  });
});
