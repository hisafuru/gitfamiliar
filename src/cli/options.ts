import type { CliOptions, ScoringMode, FilterMode, WeightConfig } from '../core/types.js';
import { DEFAULT_WEIGHTS, DEFAULT_EXPIRATION } from '../core/types.js';
import { parseExpirationConfig } from '../scoring/expiration.js';

export interface RawCliOptions {
  mode?: string;
  user?: string;
  filter?: string;
  expiration?: string;
  html?: boolean;
  weights?: string;
}

export function parseOptions(raw: RawCliOptions, repoPath: string): CliOptions {
  const mode = validateMode(raw.mode || 'binary');
  const filter = validateFilter(raw.filter || 'all');

  let weights = DEFAULT_WEIGHTS;
  if (raw.weights) {
    weights = parseWeights(raw.weights);
  }

  const expiration = raw.expiration
    ? parseExpirationConfig(raw.expiration)
    : DEFAULT_EXPIRATION;

  return {
    mode,
    user: raw.user,
    filter,
    expiration,
    html: raw.html || false,
    weights,
    repoPath,
  };
}

function validateMode(mode: string): ScoringMode {
  const valid: ScoringMode[] = ['binary', 'authorship', 'review-coverage', 'weighted'];
  if (!valid.includes(mode as ScoringMode)) {
    throw new Error(`Invalid mode: "${mode}". Valid modes: ${valid.join(', ')}`);
  }
  return mode as ScoringMode;
}

function validateFilter(filter: string): FilterMode {
  const valid: FilterMode[] = ['all', 'written', 'reviewed'];
  if (!valid.includes(filter as FilterMode)) {
    throw new Error(`Invalid filter: "${filter}". Valid filters: ${valid.join(', ')}`);
  }
  return filter as FilterMode;
}

function parseWeights(s: string): WeightConfig {
  const parts = s.split(',').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) {
    throw new Error(`Invalid weights: "${s}". Expected format: "0.5,0.35,0.15"`);
  }
  const sum = parts[0] + parts[1] + parts[2];
  if (Math.abs(sum - 1) > 0.01) {
    throw new Error(`Weights must sum to 1.0, got ${sum}`);
  }
  return { blame: parts[0], commit: parts[1], review: parts[2] };
}
