import { afterAll, beforeAll, expect, test } from 'bun:test';
import { opensearchCount, opensearchIndices, opensearchMapping, opensearchSearch } from './db-client';

// The re-check of #399: an index argument was validated as typed but sent as a path, so `%5Fall` (`_all`) and `%2e%2e`
// (`..`) passed and searched every index. Answers were buffered without a limit, and the 30-second timeout only
// measured inactivity, so a server that kept trickling bytes held the request open indefinitely.
const paths: string[] = [];
let mode: 'json' | 'large' | 'trickle' = 'json';
let server: ReturnType<typeof Bun.serve>;

beforeAll(() => {
  server = Bun.serve({
    port: 0,
    fetch: (request) => {
      paths.push(new URL(request.url).pathname);
      if (mode === 'large') return new Response(`{"hits":"${'x'.repeat(4096)}"}`);
      if (mode === 'trickle') {
        return new Response(
          new ReadableStream({
            async pull(controller) {
              await Bun.sleep(50);
              controller.enqueue(new TextEncoder().encode(' '));
            }
          })
        );
      }
      return Response.json({ hits: { hits: [] }, count: 0 });
    }
  });
});
afterAll(() => {
  server.stop(true);
});

const conn = (limits?: { timeoutMs?: number; maxResponseBytes?: number }) => ({
  mode: 'local' as const,
  port: server.port!,
  ...(limits && { limits })
});

test('an index that decodes to an endpoint, a path step or a separator is refused before a request', async () => {
  mode = 'json';
  paths.length = 0;
  for (const index of [
    '%5Fall',
    '%5fsearch',
    '%2e%2e',
    '%2E%2E',
    'orders,%2e%2e',
    '.',
    '..',
    'orders%2F_doc',
    'a%3Fb',
    '%zz',
    'orders,'
  ]) {
    expect(await opensearchSearch(conn(), { index, query: { match_all: {} } })).toMatchObject({
      ok: false,
      code: 'INVALID_INDEX'
    });
    expect(await opensearchCount(conn(), { index })).toMatchObject({ ok: false, code: 'INVALID_INDEX' });
  }
  expect(paths).toEqual([]);
});

test('a valid index reaches OpenSearch as given, patterns and lists included', async () => {
  mode = 'json';
  paths.length = 0;
  await opensearchSearch(conn(), { index: 'logs-*', query: { match_all: {} } });
  await opensearchSearch(conn(), { index: 'orders,archive', query: { match_all: {} } });
  await opensearchMapping(conn(), { index: 'orders.v2' });
  await opensearchCount(conn());
  expect(paths).toEqual(['/logs-*/_search', '/orders,archive/_search', '/orders.v2/_mapping', '/_all/_count']);
});

test('an answer larger than the limit is refused, whether the request has a body or not', async () => {
  mode = 'large';
  const limited = conn({ maxResponseBytes: 1024 });
  for (const result of [
    await opensearchIndices(limited),
    await opensearchSearch(limited, { index: 'orders', query: { match_all: {} } })
  ]) {
    expect(result).toMatchObject({ ok: false, code: 'RESPONSE_TOO_LARGE' });
    expect((result as { error: string }).error).toContain('more than 1 KB');
  }
  expect(await opensearchIndices(conn({ maxResponseBytes: 8192 }))).toMatchObject({ ok: true });
});

test('a request ends at its total deadline even while the answer keeps arriving', async () => {
  mode = 'trickle';
  const limited = conn({ timeoutMs: 400 });
  for (const send of [
    () => opensearchIndices(limited),
    () => opensearchSearch(limited, { index: 'orders', query: { match_all: {} } })
  ]) {
    const started = performance.now();
    expect(await send()).toEqual({ ok: false, error: 'OpenSearch did not answer within 0.4 s.', code: 'TIMEOUT' });
    expect(performance.now() - started).toBeLessThan(3000);
  }
});
