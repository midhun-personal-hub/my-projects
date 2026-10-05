/**
 * Enterprise Batch Processing Queue with Controlled Concurrency
 *
 * Executes asynchronous tasks (e.g. Graph API mutations) over array of items
 * with maximum concurrency limit (default: 10) to prevent HTTP connection exhaustion,
 * rate limiting (429), and memory spikes.
 */

export interface BatchTaskResult<T, R> {
  item: T;
  success: boolean;
  result?: R;
  error?: any;
}

export async function runControlledBatch<T, R>(
  items: T[],
  taskFn: (item: T) => Promise<R>,
  concurrencyLimit = 10
): Promise<BatchTaskResult<T, R>[]> {
  if (!items || items.length === 0) return [];

  const results: BatchTaskResult<T, R>[] = new Array(items.length);
  let currentIndex = 0;

  async function worker() {
    while (currentIndex < items.length) {
      const index = currentIndex++;
      const item = items[index];
      try {
        const res = await taskFn(item);
        results[index] = { item, success: true, result: res };
      } catch (err) {
        results[index] = { item, success: false, error: err };
      }
    }
  }

  const workerCount = Math.min(concurrencyLimit, items.length);
  const workers = Array.from({ length: workerCount }, () => worker());
  await Promise.all(workers);

  return results;
}
