// Small helpers for doing several things at once without flooding a weak connection.

export type Settled<T> = { ok: true; value: T } | { ok: false; error: unknown };

/** Runs `worker` over `items` with at most `limit` in flight. Results keep their order and one failure never stops the rest. */
export async function runPool<T, R>(items: readonly T[], limit: number, worker: (item: T, index: number) => Promise<R>): Promise<Settled<R>[]> {
  const results: Settled<R>[] = new Array(items.length);
  let next = 0;
  const lane = async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      try { results[index] = { ok: true, value: await worker(items[index], index) }; }
      catch (error) { results[index] = { ok: false, error }; }
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, lane));
  return results;
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Tries `task` up to `attempts` times, waiting longer after each failure. `shouldRetry` can stop early for errors that will not improve. */
export async function withRetry<T>(
  task: (attempt: number) => Promise<T>,
  { attempts = 3, delayMs = 400, shouldRetry = () => true, sleep = wait }: { attempts?: number; delayMs?: number; shouldRetry?: (error: unknown) => boolean; sleep?: (ms: number) => Promise<void> } = {},
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try { return await task(attempt); }
    catch (error) {
      lastError = error;
      if (attempt === attempts || !shouldRetry(error)) break;
      await sleep(delayMs * 2 ** (attempt - 1));
    }
  }
  throw lastError;
}
