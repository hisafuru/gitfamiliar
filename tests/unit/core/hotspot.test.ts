import { describe, it, expect } from "vitest";
import { classifyHotspotRisk } from "../../../src/core/hotspot.js";

describe("classifyHotspotRisk", () => {
  it("classifies risk >= 0.6 as critical", () => {
    expect(classifyHotspotRisk(0.6)).toBe("critical");
    expect(classifyHotspotRisk(0.9)).toBe("critical");
    expect(classifyHotspotRisk(1.0)).toBe("critical");
  });

  it("classifies risk 0.4-0.6 as high", () => {
    expect(classifyHotspotRisk(0.4)).toBe("high");
    expect(classifyHotspotRisk(0.5)).toBe("high");
    expect(classifyHotspotRisk(0.59)).toBe("high");
  });

  it("classifies risk 0.2-0.4 as medium", () => {
    expect(classifyHotspotRisk(0.2)).toBe("medium");
    expect(classifyHotspotRisk(0.3)).toBe("medium");
    expect(classifyHotspotRisk(0.39)).toBe("medium");
  });

  it("classifies risk < 0.2 as low", () => {
    expect(classifyHotspotRisk(0)).toBe("low");
    expect(classifyHotspotRisk(0.1)).toBe("low");
    expect(classifyHotspotRisk(0.19)).toBe("low");
  });

  it("risk = freq * (1 - familiarity) produces expected results", () => {
    // File with 0% familiarity, max frequency → risk = 1.0 * (1 - 0) = 1.0
    expect(classifyHotspotRisk(1.0 * (1 - 0))).toBe("critical");

    // File with 100% familiarity, max frequency → risk = 1.0 * (1 - 1) = 0
    expect(classifyHotspotRisk(1.0 * (1 - 1))).toBe("low");

    // File with 50% familiarity, 60% frequency → risk = 0.6 * 0.5 = 0.3
    expect(classifyHotspotRisk(0.6 * (1 - 0.5))).toBe("medium");

    // File with 10% familiarity, 80% frequency → risk = 0.8 * 0.9 = 0.72
    expect(classifyHotspotRisk(0.8 * (1 - 0.1))).toBe("critical");
  });
});
