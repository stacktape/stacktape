type FetchOptions = {
  headers?: Record<string, any>;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: Record<string, any> | any[];
  timeoutMs?: number;
  /** Ends the request early, in addition to the timeout. */
  signal?: AbortSignal;
};

export const jsonFetch = (url: string, options?: FetchOptions): Promise<any> => {
  const { method = 'GET', headers = {}, body, timeoutMs = 10000, signal } = options || {};
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), timeoutMs);

  return globalThis
    .fetch(url, {
      method,
      ...(body && { body: JSON.stringify(body) }),
      headers: { 'Content-Type': 'application/json', ...headers },
      signal: signal ? AbortSignal.any([signal, abortController.signal]) : abortController.signal
    })
    .then((response) => response.json())
    .then((res) => res)
    .finally(() => clearTimeout(timeoutId));
};
