import { createTRPCClient, httpBatchLink } from '@trpc/client';

const TRPC_REQUEST_TIMEOUT_MS = 30000;

const fetchWithTimeout =
  (timeoutMs: number) =>
  async (url: string, options: RequestInit = {}) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } finally {
      clearTimeout(timeoutId);
    }
  };

export const createTypedTrpcClient = <TClient>({
  url,
  headers,
  timeoutMs = TRPC_REQUEST_TIMEOUT_MS
}: {
  url: string;
  headers?: Record<string, string> | (() => Promise<Record<string, string>>);
  timeoutMs?: number;
}) => {
  return createTRPCClient<any>({
    links: [
      httpBatchLink({
        url,
        headers,
        fetch: fetchWithTimeout(timeoutMs) as any
      })
    ]
  }) as unknown as TClient;
};
