import { describe, it, expect } from "vitest";
import {
  makeBar,
  formatPercent,
  getModeLabel,
} from "../../../src/cli/output/terminal-utils.js";

describe("formatPercent", () => {
  it("formats 0 as 0%", () => {
    expect(formatPercent(0)).toBe("0%");
  });

  it("formats 1 as 100%", () => {
    expect(formatPercent(1)).toBe("100%");
  });

  it("rounds to nearest integer", () => {
    expect(formatPercent(0.456)).toBe("46%");
    expect(formatPercent(0.751)).toBe("75%");
  });
});

describe("getModeLabel", () => {
  it("returns 'Committed mode' for committed", () => {
    expect(getModeLabel("committed")).toBe("Committed mode");
  });

  it("returns 'Code Coverage mode' for code-coverage", () => {
    expect(getModeLabel("code-coverage")).toBe("Code Coverage mode");
  });

  it("returns 'Weighted mode' for weighted", () => {
    expect(getModeLabel("weighted")).toBe("Weighted mode");
  });

  it("returns the input for unknown modes", () => {
    expect(getModeLabel("custom")).toBe("custom");
  });
});

describe("makeBar", () => {
  it("returns a string of the specified width", () => {
    // Strip ANSI codes for length check
    const bar = makeBar(0.5, 10);
    const stripped = bar.replace(/\x1b\[[0-9;]*m/g, "");
    expect(stripped).toHaveLength(10);
  });

  it("uses default width of 10", () => {
    const bar = makeBar(0.5);
    const stripped = bar.replace(/\x1b\[[0-9;]*m/g, "");
    expect(stripped).toHaveLength(10);
  });

  it("fills proportional to score", () => {
    const bar = makeBar(0.3, 10);
    const stripped = bar.replace(/\x1b\[[0-9;]*m/g, "");
    const filled = (stripped.match(/\u2588/g) || []).length;
    expect(filled).toBe(3);
  });

  it("handles 0 score", () => {
    const bar = makeBar(0, 10);
    const stripped = bar.replace(/\x1b\[[0-9;]*m/g, "");
    const filled = (stripped.match(/\u2588/g) || []).length;
    expect(filled).toBe(0);
  });

  it("handles 1.0 score", () => {
    const bar = makeBar(1, 10);
    const stripped = bar.replace(/\x1b\[[0-9;]*m/g, "");
    const filled = (stripped.match(/\u2588/g) || []).length;
    expect(filled).toBe(10);
  });
});
