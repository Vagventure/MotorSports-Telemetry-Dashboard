/**
 * OpenF1 REST client.
 *
 * The API is unauthenticated and sends `access-control-allow-origin: *`, so the
 * browser can talk to it directly. What it does enforce is a hard rate limit:
 * 3 requests/second AND 30 requests/minute on the free tier. Every call goes
 * through a queue that respects both windows, because blowing through them
 * returns 429s that would otherwise land mid-load.
 */

const BASE_URL = 'https://api.openf1.org/v1';

const MAX_PER_SECOND = 3;
const MAX_PER_MINUTE = 30;
const MAX_RETRIES = 4;

/** Timestamps (ms) of requests already dispatched, oldest first. */
const sentAt: number[] = [];

let chain: Promise<unknown> = Promise.resolve();

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Resolves once dispatching another request would stay inside both windows.
 */
async function waitForSlot(): Promise<void> {
  for (;;) {
    const now = Date.now();
    while (sentAt.length > 0 && now - sentAt[0] >= 60_000) sentAt.shift();

    const inLastSecond = sentAt.filter((t) => now - t < 1000).length;
    const inLastMinute = sentAt.length;

    if (inLastSecond < MAX_PER_SECOND && inLastMinute < MAX_PER_MINUTE) {
      sentAt.push(now);
      return;
    }

    // Wait until whichever window frees up first.
    let waitMs = 50;
    if (inLastSecond >= MAX_PER_SECOND) {
      const oldestInSecond = sentAt[sentAt.length - inLastSecond];
      waitMs = Math.max(waitMs, 1000 - (now - oldestInSecond) + 10);
    }
    if (inLastMinute >= MAX_PER_MINUTE) {
      waitMs = Math.max(waitMs, 60_000 - (now - sentAt[0]) + 10);
    }
    await sleep(waitMs);
  }
}

export class Of1Error extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = 'Of1Error';
  }
}

function buildUrl(endpoint: string, params: Record<string, string | number | undefined>): string {
  const qs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== '')
    // OpenF1 uses operators inside the key ("date>=..."), so the key needs
    // encoding too — URLSearchParams would mangle the comparison characters.
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  return `${BASE_URL}/${endpoint}${qs ? `?${qs}` : ''}`;
}

/**
 * Fetch one endpoint. Calls are serialised through a shared chain so concurrent
 * callers cannot race past the rate limiter.
 */
export function of1<T>(
  endpoint: string,
  params: Record<string, string | number | undefined> = {},
  signal?: AbortSignal
): Promise<T[]> {
  const run = async (): Promise<T[]> => {
    const url = buildUrl(endpoint, params);

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      await waitForSlot();
      if (signal?.aborted) throw new Of1Error('aborted');

      let res: Response;
      try {
        res = await fetch(url, { signal, headers: { accept: 'application/json' } });
      } catch (err) {
        if (signal?.aborted) throw new Of1Error('aborted');
        if (attempt === MAX_RETRIES) {
          throw new Of1Error(`Network error calling /${endpoint}: ${(err as Error).message}`);
        }
        await sleep(500 * 2 ** attempt);
        continue;
      }

      if (res.status === 429 || res.status >= 500) {
        if (attempt === MAX_RETRIES) {
          throw new Of1Error(`/${endpoint} failed with ${res.status}`, res.status);
        }
        const retryAfter = Number(res.headers.get('retry-after'));
        await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 1000 * 2 ** attempt);
        continue;
      }

      if (!res.ok) throw new Of1Error(`/${endpoint} failed with ${res.status}`, res.status);

      const body = (await res.json()) as T[] | { detail?: string };
      if (!Array.isArray(body)) {
        throw new Of1Error(`/${endpoint} returned an unexpected payload`);
      }
      return body;
    }

    throw new Of1Error(`/${endpoint} exhausted retries`);
  };

  // Serialise, but do not let one rejection poison the chain for everyone else.
  const result = chain.then(run, run);
  chain = result.then(
    () => undefined,
    () => undefined
  );
  return result;
}

/** Formats a Date as the naive UTC string OpenF1 expects in date filters. */
export function of1Date(d: Date): string {
  return d.toISOString().replace('Z', '');
}

/** Number of requests the limiter has dispatched in the trailing minute. */
export function pendingRateWindow(): number {
  const now = Date.now();
  return sentAt.filter((t) => now - t < 60_000).length;
}
