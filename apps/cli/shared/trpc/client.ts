import { createTRPCClient, httpBatchLink } from '@trpc/client';

const TRPC_REQUEST_TIMEOUT_MS = 30000;

const fetchWithTimeout = async (url: string, options: RequestInit = {}) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TRPC_REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
};

export const createTypedTrpcClient = <TClient>({
  url,
  headers
}: {
  url: string;
  headers?: Record<string, string> | (() => Promise<Record<string, string>>);
}) => {
  return createTRPCClient<any>({
    links: [
      httpBatchLink({
        url,
        headers,
        fetch: fetchWithTimeout as any
      })
    ]
  }) as unknown as TClient;
};
