/**
 * Concurrency Utilities
 *
 * Bound the number of async tasks running at the same time, e.g. to avoid
 * exhausting sockets when fanning out hundreds of API requests.
 */

export type ConcurrencyLimiter = <T>(task: () => Promise<T>) => Promise<T>;

/**
 * Create a limiter that runs at most `limit` tasks at once; extra tasks wait in FIFO order.
 *
 * Declare it at module level to share the cap across every caller of the process
 * (e.g. all pages rendered in parallel during a build), not just within one call.
 *
 * @example
 * const limit = createConcurrencyLimiter(24);
 * const articles = await Promise.all(ids.map(id => limit(() => fetchArticle(id))));
 */
export function createConcurrencyLimiter(limit: number): ConcurrencyLimiter {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new RangeError(`Concurrency limit must be a positive integer, got ${limit}`);
  }

  let active = 0;
  const queue: Array<() => void> = [];

  const acquire = (): Promise<void> => {
    if (active < limit) {
      active++;
      return Promise.resolve();
    }
    return new Promise(resolve => queue.push(resolve));
  };

  // Hand the slot directly to the next waiter so `active` never exceeds `limit`
  const release = () => {
    const nextTask = queue.shift();
    if (nextTask) {
      nextTask();
    } else {
      active--;
    }
  };

  return async task => {
    await acquire();
    try {
      return await task();
    } finally {
      release();
    }
  };
}
