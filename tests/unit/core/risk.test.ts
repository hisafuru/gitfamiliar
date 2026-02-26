import { describe, it, expect } from "vitest";
import {
  classifyHotspotRisk,
  classifyCoverageRisk,
} from "../../../src/core/risk.js";

describe("classifyCoverageRisk", () => {
  it("classifies 0 contributors as risk", () => {
    expect(classifyCoverageRisk(0)).toBe("risk");
  });

  it("classifies 1 contributor as risk", () => {
    expect(classifyCoverageRisk(1)).toBe("risk");
  });

  it("classifies 2 contributors as moderate", () => {
    expect(classifyCoverageRisk(2)).toBe("moderate");
  });

  it("classifies 3 contributors as moderate", () => {
    expect(classifyCoverageRisk(3)).toBe("moderate");
  });

  it("classifies 4+ contributors as safe", () => {
    expect(classifyCoverageRisk(4)).toBe("safe");
    expect(classifyCoverageRisk(10)).toBe("safe");
  });
});

describe("classifyHotspotRisk (re-exported)", () => {
  it("is importable from risk module", () => {
    expect(classifyHotspotRisk(0.7)).toBe("critical");
    expect(classifyHotspotRisk(0.5)).toBe("high");
    expect(classifyHotspotRisk(0.3)).toBe("medium");
    expect(classifyHotspotRisk(0.1)).toBe("low");
  });
});
