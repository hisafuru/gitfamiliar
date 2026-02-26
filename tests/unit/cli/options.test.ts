import { describe, it, expect } from "vitest";
import { parseOptions } from "../../../src/cli/options.js";

describe("parseOptions", () => {
  const repoPath = "/tmp/repo";

  it("returns defaults when no options provided", () => {
    const result = parseOptions({}, repoPath);
    expect(result.mode).toBe("committed");
    expect(result.html).toBe(false);
    expect(result.weights).toEqual({ blame: 0.5, commit: 0.5 });
    expect(result.expiration).toEqual({ policy: "never" });
    expect(result.repoPath).toBe(repoPath);
    expect(result.team).toBe(false);
    expect(result.contributorsPerFile).toBe(false);
    expect(result.hotspot).toBeUndefined();
    expect(result.user).toBeUndefined();
  });

  it("parses mode option", () => {
    expect(parseOptions({ mode: "committed" }, repoPath).mode).toBe(
      "committed",
    );
    expect(parseOptions({ mode: "code-coverage" }, repoPath).mode).toBe(
      "code-coverage",
    );
    expect(parseOptions({ mode: "weighted" }, repoPath).mode).toBe("weighted");
  });

  it("accepts legacy mode aliases", () => {
    expect(parseOptions({ mode: "binary" }, repoPath).mode).toBe("committed");
    expect(parseOptions({ mode: "authorship" }, repoPath).mode).toBe(
      "code-coverage",
    );
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

  it("parses contributorsPerFile flag", () => {
    expect(
      parseOptions({ contributorsPerFile: true }, repoPath).contributorsPerFile,
    ).toBe(true);
  });

  it("accepts --contributors alias for contributorsPerFile", () => {
    expect(
      parseOptions({ contributors: true }, repoPath).contributorsPerFile,
    ).toBe(true);
  });

  it("accepts legacy --team-coverage alias for contributorsPerFile", () => {
    expect(
      parseOptions({ teamCoverage: true }, repoPath).contributorsPerFile,
    ).toBe(true);
  });

  it("parses hotspot as personal by default", () => {
    const result = parseOptions({ hotspot: "true" }, repoPath);
    expect(result.hotspot).toBe("personal");
  });

  it("parses hotspot team mode", () => {
    const result = parseOptions({ hotspot: "team" }, repoPath);
    expect(result.hotspot).toBe("team");
  });

  it("parses since option", () => {
    const result = parseOptions({ since: "30" }, repoPath);
    expect(result.since).toBe(30);
  });

  it("accepts legacy --window alias for since", () => {
    const result = parseOptions({ window: "60" }, repoPath);
    expect(result.since).toBe(60);
  });

  it("parses expiration option", () => {
    const result = parseOptions({ expiration: "time:180d" }, repoPath);
    expect(result.expiration).toEqual({ policy: "time", duration: 180 });
  });

  it("parses demo flag", () => {
    expect(parseOptions({ demo: true }, repoPath).demo).toBe(true);
  });

  it("defaults demo to false", () => {
    expect(parseOptions({}, repoPath).demo).toBe(false);
  });
});
