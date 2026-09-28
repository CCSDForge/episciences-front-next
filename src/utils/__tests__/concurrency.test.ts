import { describe, it, expect } from 'vitest';
import { createConcurrencyLimiter } from '../concurrency';

const tick = () => new Promise(resolve => setTimeout(resolve, 1));

describe('createConcurrencyLimiter', () => {
  it('should never run more than `limit` tasks at once', async () => {
    const limit = createConcurrencyLimiter(3);
    let inFlight = 0;
    let maxInFlight = 0;

    await Promise.all(
      Array.from({ length: 20 }, () =>
        limit(async () => {
          inFlight++;
          maxInFlight = Math.max(maxInFlight, inFlight);
          await tick();
          inFlight--;
        })
      )
    );

    expect(maxInFlight).toBe(3);
  });

  it('should resolve each task with its own result, in input order', async () => {
    const limit = createConcurrencyLimiter(2);

    const results = await Promise.all(
      [30, 10, 20].map(n =>
        limit(async () => {
          await new Promise(resolve => setTimeout(resolve, n));
          return n;
        })
      )
    );

    expect(results).toEqual([30, 10, 20]);
  });

  it('should start queued tasks in FIFO order', async () => {
    const limit = createConcurrencyLimiter(1);
    const started: number[] = [];

    await Promise.all(
      [1, 2, 3, 4].map(n =>
        limit(async () => {
          started.push(n);
          await tick();
        })
      )
    );

    expect(started).toEqual([1, 2, 3, 4]);
  });

  it('should release the slot when a task rejects', async () => {
    const limit = createConcurrencyLimiter(1);

    await expect(limit(() => Promise.reject(new Error('boom')))).rejects.toThrow('boom');
    await expect(limit(async () => 'ok')).resolves.toBe('ok');
  });

  it.each([0, -1, 1.5, Number.NaN])('should reject invalid limit %s', invalid => {
    expect(() => createConcurrencyLimiter(invalid)).toThrow(RangeError);
  });
});
