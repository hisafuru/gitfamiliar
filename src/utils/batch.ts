const DEFAULT_BATCH_SIZE = 10;

/**
 * Process items in batches with concurrent execution within each batch.
 */
export async function processBatch<T>(
  items: T[],
  fn: (item: T) => Promise<void>,
  batchSize: number = DEFAULT_BATCH_SIZE,
): Promise<void> {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    await Promise.all(batch.map(fn));
  }
}
