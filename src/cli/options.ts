import type {
  CliOptions,
  ScoringMode,
  WeightConfig,
  HotspotMode,
} from "../core/types.js";
import { DEFAULT_WEIGHTS, DEFAULT_EXPIRATION } from "../core/types.js";
import { parseExpirationConfig } from "../scoring/expiration.js";

export interface RawCliOptions {
  mode?: string;
  user?: string[];
  expiration?: string;
  html?: boolean;
  weights?: string;
  team?: boolean;
  teamCoverage?: boolean;
  hotspot?: string;
  window?: string;
}

export function parseOptions(raw: RawCliOptions, repoPath: string): CliOptions {
  const mode = validateMode(raw.mode || "binary");

  let weights = DEFAULT_WEIGHTS;
  if (raw.weights) {
    weights = parseWeights(raw.weights);
  }

  const expiration = raw.expiration
    ? parseExpirationConfig(raw.expiration)
    : DEFAULT_EXPIRATION;

  // Handle --user: Commander collects multiple -u flags into an array
  let user: string | string[] | undefined;
  if (raw.user && raw.user.length === 1) {
    user = raw.user[0];
  } else if (raw.user && raw.user.length > 1) {
    user = raw.user;
  }

  // Parse --hotspot flag: true (no arg) or "team" or "personal"
  let hotspot: HotspotMode | undefined;
  if (raw.hotspot !== undefined && raw.hotspot !== false) {
    if (raw.hotspot === "team") {
      hotspot = "team";
    } else {
      hotspot = "personal";
    }
  }

  // Parse --window flag
  const windowDays = raw.window ? parseInt(raw.window, 10) : undefined;

  return {
    mode,
    user,
    expiration,
    html: raw.html || false,
    weights,
    repoPath,
    team: raw.team || false,
    teamCoverage: raw.teamCoverage || false,
    hotspot,
    window: windowDays,
  };
}

function validateMode(mode: string): ScoringMode {
  const valid: ScoringMode[] = ["binary", "authorship", "weighted"];
  if (!valid.includes(mode as ScoringMode)) {
    throw new Error(
      `Invalid mode: "${mode}". Valid modes: ${valid.join(", ")}`,
    );
  }
  return mode as ScoringMode;
}

function parseWeights(s: string): WeightConfig {
  const parts = s.split(",").map(Number);
  if (parts.length !== 2 || parts.some(isNaN)) {
    throw new Error(`Invalid weights: "${s}". Expected format: "0.5,0.5"`);
  }
  const sum = parts[0] + parts[1];
  if (Math.abs(sum - 1) > 0.01) {
    throw new Error(`Weights must sum to 1.0, got ${sum}`);
  }
  return { blame: parts[0], commit: parts[1] };
}
