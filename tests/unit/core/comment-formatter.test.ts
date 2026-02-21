import { describe, it, expect } from "vitest";
import { formatPRComment } from "../../../src/ci/comment-formatter.js";
import type { PRAnalysisResult } from "../../../src/core/types.js";

describe("formatPRComment", () => {
  it("generates a valid markdown comment for high risk PR", () => {
    const result: PRAnalysisResult = {
      prNumber: 42,
      author: "testuser",
      changedFiles: ["src/a.ts", "src/b.ts", "src/c.ts"],
      familiarityScores: new Map([
        ["src/a.ts", 0.85],
        ["src/b.ts", 0],
        ["src/c.ts", 0.1],
      ]),
      unfamiliarFiles: ["src/b.ts", "src/c.ts"],
      suggestedReviewers: [
        {
          user: { name: "Alice", email: "alice@test.com" },
          relevantFiles: ["src/a.ts", "src/b.ts"],
          avgFamiliarity: 0.92,
        },
      ],
      riskLevel: "risk",
    };

    const comment = formatPRComment(result, 30);

    expect(comment).toContain("## GitFamiliar Analysis");
    expect(comment).toContain("High Risk");
    expect(comment).toContain("2/3 changed files");
    expect(comment).toContain("src/a.ts");
    expect(comment).toContain("src/b.ts");
    expect(comment).toContain("85%");
    expect(comment).toContain("0%");
    expect(comment).toContain("Unfamiliar Files (2)");
    expect(comment).toContain("Suggested Reviewers");
    expect(comment).toContain("Alice");
    expect(comment).toContain("92%");
  });

  it("generates safe comment when all files are familiar", () => {
    const result: PRAnalysisResult = {
      prNumber: 10,
      author: "testuser",
      changedFiles: ["src/a.ts"],
      familiarityScores: new Map([["src/a.ts", 1.0]]),
      unfamiliarFiles: [],
      suggestedReviewers: [],
      riskLevel: "safe",
    };

    const comment = formatPRComment(result, 30);

    expect(comment).toContain("Low Risk");
    expect(comment).toContain("familiar with all 1 changed files");
    expect(comment).not.toContain("Unfamiliar Files");
  });
});
