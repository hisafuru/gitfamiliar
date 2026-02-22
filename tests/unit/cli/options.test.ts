import { describe, it, expect } from "vitest";
import { parseOptions } from "../../../src/cli/options.js";

describe("parseOptions", () => {
  const repoPath = "/tmp/repo";

  it("returns defaults when no options provided", () => {
    const result = parseOptions({}, repoPath);
    expect(result.mode).toBe("binary");
    expect(result.html).toBe(false);
    expect(result.weights).toEqual({ blame: 0.5, commit: 0.5 });
    expect(result.expiration).toEqual({ policy: "never" });
    expect(result.repoPath).toBe(repoPath);
    expect(result.team).toBe(false);
    expect(result.teamCoverage).toBe(false);
    expect(result.hotspot).toBeUndefined();
    expect(result.user).toBeUndefined();
  });

  it("parses mode option", () => {
    expect(parseOptions({ mode: "authorship" }, repoPath).mode).toBe(
      "authorship",
    );
    expect(parseOptions({ mode: "weighted" }, repoPath).mode).toBe("weighted");
    expect(parseOptions({ mode: "binary" }, repoPath).mode).toBe("binary");
  });

  it("throws on invalid mode", () => {
    expect(() => parseOptions({ mode: "invalid" }, repoPath)).toThrow(
      'Invalid mode: "invalid"',
    );
  });

  it("parses weights option", () => {
    const result = parseOptions({ weights: "0.6,0.4" }, repoPath);
    expect(result.weights).toEqual({ blame: 0.6, commit: 0.4 });
  });

  it("throws on weights that don't sum to 1", () => {
    expect(() => parseOptions({ weights: "0.5,0.3" }, repoPath)).toThrow(
      "Weights must sum to 1.0",
    );
  });

  it("throws on invalid weight format", () => {
    expect(() => parseOptions({ weights: "abc" }, repoPath)).toThrow(
      "Invalid weights",
    );
  });

  it("parses single user as string", () => {
    const result = parseOptions({ user: ["Alice"] }, repoPath);
    expect(result.user).toBe("Alice");
  });

  it("parses multiple users as array", () => {
    const result = parseOptions({ user: ["Alice", "Bob"] }, repoPath);
    expect(result.user).toEqual(["Alice", "Bob"]);
  });

  it("parses html flag", () => {
    expect(parseOptions({ html: true }, repoPath).html).toBe(true);
  });

  it("parses team flag", () => {
    expect(parseOptions({ team: true }, repoPath).team).toBe(true);
  });

  it("parses teamCoverage flag", () => {
    expect(parseOptions({ teamCoverage: true }, repoPath).teamCoverage).toBe(
      true,
    );
  });

  it("parses hotspot as personal by default", () => {
    const result = parseOptions({ hotspot: "true" }, repoPath);
    expect(result.hotspot).toBe("personal");
  });

  it("parses hotspot team mode", () => {
    const result = parseOptions({ hotspot: "team" }, repoPath);
    expect(result.hotspot).toBe("team");
  });

  it("parses window option", () => {
    const result = parseOptions({ window: "30" }, repoPath);
    expect(result.window).toBe(30);
  });

  it("parses expiration option", () => {
    const result = parseOptions({ expiration: "time:180d" }, repoPath);
    expect(result.expiration).toEqual({ policy: "time", duration: 180 });
  });
});
