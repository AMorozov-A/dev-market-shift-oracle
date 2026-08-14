export class HttpRequestError extends Error {
  constructor(
    message: string,
    readonly statusCode: number | null,
    readonly retryable: boolean,
    readonly url: string,
    readonly body: unknown = null,
  ) {
    super(message);
    this.name = 'HttpRequestError';
  }
}

export interface FetchJsonResult {
  status: number;
  url: string;
  data: unknown;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

export async function fetchJsonWithRetry(options: {
  url: string;
  headers?: Record<string, string>;
  timeoutMs: number;
  attempts?: number;
  signal?: AbortSignal;
}): Promise<FetchJsonResult> {
  const attempts = options.attempts ?? 3;
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs);

    if (options.signal) {
      if (options.signal.aborted) {
        controller.abort();
      } else {
        options.signal.addEventListener('abort', () => controller.abort(), {
          once: true,
        });
      }
    }

    try {
      const response = await fetch(options.url, {
        method: 'GET',
        headers: options.headers,
        signal: controller.signal,
      });

      if (!response.ok) {
        let errorBody: unknown = null;
        try {
          errorBody = await response.json();
        } catch {
          errorBody = null;
        }
        const retryable = isRetryableStatus(response.status);
        const error = new HttpRequestError(
          `HTTP ${response.status} for ${options.url}`,
          response.status,
          retryable,
          options.url,
          errorBody,
        );
        if (!retryable || attempt === attempts) {
          throw error;
        }
        lastError = error;
        await sleep(250 * 2 ** (attempt - 1));
        continue;
      }

      const data: unknown = await response.json();
      return { status: response.status, url: options.url, data };
    } catch (error: unknown) {
      if (error instanceof HttpRequestError) {
        throw error;
      }
      const retryable = true;
      const wrapped = new HttpRequestError(
        error instanceof Error ? error.message : 'Request failed',
        null,
        retryable,
        options.url,
      );
      lastError = wrapped;
      if (attempt === attempts) {
        throw wrapped;
      }
      await sleep(250 * 2 ** (attempt - 1));
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Request failed');
}

export async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) {
    return [];
  }

  const limit = Math.max(1, concurrency);
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (true) {
      const current = nextIndex;
      nextIndex += 1;
      if (current >= items.length) {
        return;
      }
      results[current] = await mapper(items[current], current);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker()),
  );
  return results;
}
