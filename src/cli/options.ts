import type {
  CliOptions,
  ScoringMode,
  FilterMode,
  WeightConfig,
  HotspotMode,
} from "../core/types.js";
import { DEFAULT_WEIGHTS, DEFAULT_EXPIRATION } from "../core/types.js";
import { parseExpirationConfig } from "../scoring/expiration.js";

export interface RawCliOptions {
  mode?: string;
  user?: string[];
  filter?: string;
  expiration?: string;
  html?: boolean;
  weights?: string;
  team?: boolean;
  teamCoverage?: boolean;
  hotspot?: string;
  window?: string;
  githubUrl?: string;
  checkGithub?: boolean;
}

export function parseOptions(raw: RawCliOptions, repoPath: string): CliOptions {
  const mode = validateMode(raw.mode || "binary");
  const filter = validateFilter(raw.filter || "all");

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
    filter,
    expiration,
    html: raw.html || false,
    weights,
    repoPath,
    team: raw.team || false,
    teamCoverage: raw.teamCoverage || false,
    hotspot,
    window: windowDays,
    githubUrl: raw.githubUrl,
    checkGithub: raw.checkGithub || false,
  };
}

function validateMode(mode: string): ScoringMode {
  const valid: ScoringMode[] = [
    "binary",
    "authorship",
    "review-coverage",
    "weighted",
  ];
  if (!valid.includes(mode as ScoringMode)) {
    throw new Error(
      `Invalid mode: "${mode}". Valid modes: ${valid.join(", ")}`,
    );
  }
  return mode as ScoringMode;
}

function validateFilter(filter: string): FilterMode {
  const valid: FilterMode[] = ["all", "written", "reviewed"];
  if (!valid.includes(filter as FilterMode)) {
    throw new Error(
      `Invalid filter: "${filter}". Valid filters: ${valid.join(", ")}`,
    );
  }
  return filter as FilterMode;
}

function parseWeights(s: string): WeightConfig {
  const parts = s.split(",").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) {
    throw new Error(
      `Invalid weights: "${s}". Expected format: "0.5,0.35,0.15"`,
    );
  }
  const sum = parts[0] + parts[1] + parts[2];
  if (Math.abs(sum - 1) > 0.01) {
    throw new Error(`Weights must sum to 1.0, got ${sum}`);
  }
  return { blame: parts[0], commit: parts[1], review: parts[2] };
}
