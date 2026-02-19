import { describe, it, expect } from 'vitest';
import { sigmoid, recencyDecay, scopeFactor, normalizedDiff, daysBetween } from '../../../src/utils/math.js';

describe('sigmoid', () => {
  it('returns 0 for 0', () => {
    expect(sigmoid(0)).toBe(0);
  });

  it('returns 0 for negative values', () => {
    expect(sigmoid(-1)).toBe(0);
  });

  it('approaches 1 for large values', () => {
    expect(sigmoid(100)).toBeCloseTo(1, 2);
  });

  it('returns 0.5 for x=k', () => {
    expect(sigmoid(0.3, 0.3)).toBeCloseTo(0.5, 5);
  });

  it('matches expected values', () => {
    // sigmoid(0.15) with k=0.3: 0.15 / (0.15 + 0.3) = 0.333...
    expect(sigmoid(0.15, 0.3)).toBeCloseTo(1 / 3, 3);
  });
});

describe('recencyDecay', () => {
  it('returns 1 for 0 days', () => {
    expect(recencyDecay(0)).toBe(1);
  });

  it('returns 0.5 for half-life days', () => {
    expect(recencyDecay(180, 180)).toBeCloseTo(0.5, 5);
  });

  it('returns ~0.25 for 2x half-life', () => {
    expect(recencyDecay(360, 180)).toBeCloseTo(0.25, 2);
  });

  it('matches requirement table values', () => {
    // 30 days -> 0.89
    expect(recencyDecay(30, 180)).toBeCloseTo(0.89, 1);
    // 90 days -> 0.71
    expect(recencyDecay(90, 180)).toBeCloseTo(0.71, 1);
    // 365 days -> 0.25
    expect(recencyDecay(365, 180)).toBeCloseTo(0.25, 1);
  });
});

describe('scopeFactor', () => {
  it('returns 1 for small PRs', () => {
    expect(scopeFactor(4)).toBe(1);
  });

  it('returns 1 for threshold-sized PRs', () => {
    expect(scopeFactor(20)).toBe(1);
  });

  it('returns 0.5 for 2x threshold PRs', () => {
    expect(scopeFactor(40)).toBeCloseTo(0.5, 5);
  });
});

describe('normalizedDiff', () => {
  it('returns 0 for zero file size', () => {
    expect(normalizedDiff(10, 5, 0)).toBe(0);
  });

  it('weights deleted at 0.5', () => {
    // (10 + 0.5 * 4) / 200 = 12 / 200 = 0.06
    expect(normalizedDiff(10, 4, 200)).toBeCloseTo(0.06, 5);
  });
});

describe('daysBetween', () => {
  it('returns 0 for same date', () => {
    const d = new Date('2025-01-01');
    expect(daysBetween(d, d)).toBe(0);
  });

  it('returns correct days', () => {
    const a = new Date('2025-01-01');
    const b = new Date('2025-01-31');
    expect(daysBetween(a, b)).toBeCloseTo(30, 0);
  });
});
