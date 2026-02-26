import type { HotspotRiskLevel, RiskLevel } from "./types.js";
import { HOTSPOT_RISK_THRESHOLDS, COVERAGE_RISK_THRESHOLDS } from "./types.js";

/** Classify hotspot risk based on combined frequency × unfamiliarity score */
export function classifyHotspotRisk(risk: number): HotspotRiskLevel {
  if (risk >= HOTSPOT_RISK_THRESHOLDS.critical) return "critical";
  if (risk >= HOTSPOT_RISK_THRESHOLDS.high) return "high";
  if (risk >= HOTSPOT_RISK_THRESHOLDS.medium) return "medium";
  return "low";
}

/** Classify coverage risk based on number of contributors */
export function classifyCoverageRisk(contributorCount: number): RiskLevel {
  if (contributorCount <= COVERAGE_RISK_THRESHOLDS.risk) return "risk";
  if (contributorCount <= COVERAGE_RISK_THRESHOLDS.moderate) return "moderate";
  return "safe";
}
