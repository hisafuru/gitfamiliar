/**
 * Sigmoid function: x / (x + k)
 * Saturates contribution of a single commit to 0-1 range.
 */
export function sigmoid(x: number, k: number = 0.3): number {
  if (x <= 0) return 0;
  return x / (x + k);
}

/**
 * Recency decay: e^(-lambda * t)
 * Models memory decay over time.
 * @param days - days since the event
 * @param halfLife - number of days for score to halve (default 180)
 */
export function recencyDecay(days: number, halfLife: number = 180): number {
  if (days <= 0) return 1;
  const lambda = Math.LN2 / halfLife;
  return Math.exp(-lambda * days);
}

/**
 * Normalized diff: (added + 0.5 * deleted) / fileSize
 */
export function normalizedDiff(
  added: number,
  deleted: number,
  fileSize: number,
): number {
  if (fileSize <= 0) return 0;
  return (added + 0.5 * deleted) / fileSize;
}

/**
 * Calculate the number of days between two dates.
 */
export function daysBetween(a: Date, b: Date): number {
  const ms = Math.abs(b.getTime() - a.getTime());
  return ms / (1000 * 60 * 60 * 24);
}
