import { describe, it, expect } from 'vitest';
import { parseExpirationConfig } from '../../../src/scoring/expiration.js';

describe('parseExpirationConfig', () => {
  it('parses "never"', () => {
    expect(parseExpirationConfig('never')).toEqual({ policy: 'never' });
  });

  it('parses empty string as never', () => {
    expect(parseExpirationConfig('')).toEqual({ policy: 'never' });
  });

  it('parses time-based', () => {
    expect(parseExpirationConfig('time:180d')).toEqual({
      policy: 'time',
      duration: 180,
    });
  });

  it('parses change-based', () => {
    expect(parseExpirationConfig('change:50%')).toEqual({
      policy: 'change',
      threshold: 0.5,
    });
  });

  it('parses combined', () => {
    expect(parseExpirationConfig('combined:365d:50%')).toEqual({
      policy: 'combined',
      duration: 365,
      threshold: 0.5,
    });
  });

  it('throws on invalid duration format', () => {
    expect(() => parseExpirationConfig('time:abc')).toThrow('Invalid duration format');
  });

  it('throws on invalid percentage format', () => {
    expect(() => parseExpirationConfig('change:abc')).toThrow('Invalid percentage format');
  });
});
