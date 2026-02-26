import { describe, it, expect } from "vitest";
import {
  getDemoFamiliarityResult,
  getDemoHotspotResult,
  getDemoCoverageResult,
  getDemoMultiUserResult,
  getDemoUnifiedData,
} from "../../../src/core/demo.js";
import type { FolderScore } from "../../../src/core/types.js";

describe("getDemoFamiliarityResult", () => {
  it("returns valid result for committed mode", () => {
    const result = getDemoFamiliarityResult("committed");
    expect(result.repoName).toBe("acme-web-app");
    expect(result.userName).toBe("Alice Chen");
    expect(result.mode).toBe("committed");
    expect(result.totalFiles).toBe(31);
    expect(result.writtenCount).toBeGreaterThan(0);
    expect(result.writtenCount).toBeLessThan(result.totalFiles);
    expect(result.tree.type).toBe("folder");
  });

  it("returns valid result for code-coverage mode", () => {
    const result = getDemoFamiliarityResult("code-coverage");
    expect(result.mode).toBe("code-coverage");
    expect(result.tree.score).toBeGreaterThan(0);
    expect(result.tree.score).toBeLessThan(1);
  });

  it("returns valid result for weighted mode", () => {
    const result = getDemoFamiliarityResult("weighted");
    expect(result.mode).toBe("weighted");
    expect(result.tree.score).toBeGreaterThan(0);
    expect(result.tree.score).toBeLessThan(1);
  });

  it("defaults to committed mode", () => {
    const result = getDemoFamiliarityResult();
    expect(result.mode).toBe("committed");
  });

  it("returns deterministic results", () => {
    const a = getDemoFamiliarityResult("committed");
    const b = getDemoFamiliarityResult("committed");
    expect(a).toEqual(b);
  });

  it("folder scores are consistent with children (code-coverage)", () => {
    const result = getDemoFamiliarityResult("code-coverage");
    const root = result.tree;
    let totalLines = 0;
    let weightedSum = 0;
    for (const child of root.children) {
      totalLines += child.lines;
      weightedSum += child.lines * child.score;
    }
    const expected = totalLines > 0 ? weightedSum / totalLines : 0;
    expect(root.score).toBeCloseTo(expected, 5);
  });
});

describe("getDemoHotspotResult", () => {
  it("returns valid result", () => {
    const result = getDemoHotspotResult();
    expect(result.repoName).toBe("acme-web-app");
    expect(result.hotspotMode).toBe("personal");
    expect(result.timeWindow).toBe(90);
    expect(result.files.length).toBe(31);
  });

  it("files are sorted by risk descending", () => {
    const result = getDemoHotspotResult();
    for (let i = 1; i < result.files.length; i++) {
      expect(result.files[i].risk).toBeLessThanOrEqual(
        result.files[i - 1].risk,
      );
    }
  });

  it("summary counts match file risk levels", () => {
    const result = getDemoHotspotResult();
    const counts = { critical: 0, high: 0, medium: 0, low: 0 };
    for (const f of result.files) counts[f.riskLevel]++;
    expect(result.summary).toEqual(counts);
  });

  it("has critical and high risk files", () => {
    const result = getDemoHotspotResult();
    expect(result.summary.critical).toBeGreaterThan(0);
    expect(result.summary.high).toBeGreaterThan(0);
  });

  it("risk = normalizedFreq * (1 - familiarity)", () => {
    const result = getDemoHotspotResult();
    const maxFreq = Math.max(...result.files.map((f) => f.changeFrequency));
    for (const f of result.files) {
      const expected =
        (f.changeFrequency / maxFreq) * (1 - f.familiarity);
      expect(f.risk).toBeCloseTo(expected, 10);
    }
  });
});

describe("getDemoCoverageResult", () => {
  it("returns valid result", () => {
    const result = getDemoCoverageResult();
    expect(result.repoName).toBe("acme-web-app");
    expect(result.totalContributors).toBe(4);
    expect(result.totalFiles).toBe(31);
    expect(result.overallBusFactor).toBe(1);
  });

  it("risk files all have <= 1 contributor", () => {
    const result = getDemoCoverageResult();
    expect(result.riskFiles.length).toBeGreaterThan(0);
    for (const f of result.riskFiles) {
      expect(f.contributorCount).toBeLessThanOrEqual(1);
    }
  });
});

describe("getDemoMultiUserResult", () => {
  it("returns valid result with 4 users", () => {
    const result = getDemoMultiUserResult();
    expect(result.repoName).toBe("acme-web-app");
    expect(result.users).toHaveLength(4);
    expect(result.userSummaries).toHaveLength(4);
    expect(result.totalFiles).toBe(31);
  });

  it("Alice is the most familiar user", () => {
    const result = getDemoMultiUserResult();
    const alice = result.userSummaries.find(
      (s) => s.user.name === "Alice Chen",
    )!;
    const others = result.userSummaries.filter(
      (s) => s.user.name !== "Alice Chen",
    );
    for (const other of others) {
      expect(alice.overallScore).toBeGreaterThan(other.overallScore);
    }
  });
});

describe("getDemoUnifiedData", () => {
  it("composes all views", () => {
    const data = getDemoUnifiedData();
    expect(data.repoName).toBe("acme-web-app");
    expect(data.userName).toBe("Alice Chen");
    expect(data.scoring.committed).toBeDefined();
    expect(data.scoring.codeCoverage).toBeDefined();
    expect(data.scoring.weighted).toBeDefined();
    expect(data.coverage).toBeDefined();
    expect(data.hotspot).toBeDefined();
    expect(data.multiUser).toBeDefined();
    expect(Object.keys(data.hotspotTeamFamiliarity).length).toBe(31);
  });

  it("all sub-results share the same repo name", () => {
    const data = getDemoUnifiedData();
    expect(data.scoring.committed.repoName).toBe("acme-web-app");
    expect(data.scoring.codeCoverage.repoName).toBe("acme-web-app");
    expect(data.scoring.weighted.repoName).toBe("acme-web-app");
    expect(data.coverage.repoName).toBe("acme-web-app");
    expect(data.hotspot.repoName).toBe("acme-web-app");
    expect(data.multiUser.repoName).toBe("acme-web-app");
  });
});
