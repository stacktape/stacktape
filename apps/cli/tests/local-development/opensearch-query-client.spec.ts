import { afterAll, beforeAll, expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import {
  opensearchCount,
  opensearchGet,
  opensearchIndices,
  opensearchMapping,
  opensearchPut,
  opensearchSearch
} from '../../src/domain/debug-services/db-client';
import { getLocalOpenSearchImageTag } from '../../src/commands/dev/local-resources/opensearch';

// `query opensearch` and the dev agent read OpenSearch through this client. Reads go as GET, searches with their query
// in the body, so the stack's debug role needs no `es:ESHttpPost`: a POST cannot be limited to searches, because
// `POST /orders/_doc/_search` indexes a document named `_search`. This runs the client against the OpenSearch version
// dev mode starts.
const docker = (args: string[]) => spawnSync('docker', args, { encoding: 'utf8', timeout: 600_000 });
const CONTAINER = `stp-opensearch-query-${randomBytes(3).toString('hex')}`;
let conn: { mode: 'local'; port: number };

beforeAll(async () => {
  const started = docker([
    'run',
    '-d',
    '--rm',
    '--name',
    CONTAINER,
    '-p',
    '127.0.0.1::9200',
    '-e',
    'discovery.type=single-node',
    '-e',
    'DISABLE_SECURITY_PLUGIN=true',
    '-e',
    'DISABLE_INSTALL_DEMO_CONFIG=true',
    '-e',
    'OPENSEARCH_JAVA_OPTS=-Xms256m -Xmx256m',
    getLocalOpenSearchImageTag('latest')
  ]);
  if (started.status !== 0) throw new Error(`docker run failed: ${started.stderr}`);
  const port = Number(docker(['port', CONTAINER, '9200/tcp']).stdout.trim().split(':').pop());
  conn = { mode: 'local', port };
  for (let attempt = 0; attempt < 120; attempt++) {
    if ((await opensearchIndices(conn)).ok) break;
    await Bun.sleep(1000);
  }
  for (const [id, customer] of [
    ['1', 'ada'],
    ['2', 'grace']
  ]) {
    expect((await opensearchPut(conn, { index: 'orders', id, doc: { customer } })).ok).toBe(true);
  }
  await fetch(`http://localhost:${port}/orders/_refresh`, { method: 'POST' });
}, 300_000);

afterAll(() => {
  docker(['rm', '-f', CONTAINER]);
});

test('a search sent as GET applies its query, size and index', async () => {
  const result = await opensearchSearch(conn, { index: 'orders', query: { match: { customer: 'grace' } } });
  expect(result.ok).toBe(true);
  const hits = (result as { data: { hits: { hits: { _id: string }[] } } }).data.hits.hits;
  expect(hits.map(({ _id }) => _id)).toEqual(['2']);

  const limited = await opensearchSearch(conn, { query: { match_all: {} }, limit: 1 });
  expect((limited as { data: { hits: { hits: unknown[] } } }).data.hits.hits).toHaveLength(1);
  expect(await opensearchCount(conn, { index: 'orders' })).toMatchObject({ ok: true, data: { count: 2 } });
});

test('an index argument that would reach another endpoint is refused before a request', async () => {
  // Sent as `POST /orders/_doc/_search` by the old client, this created document `_search`.
  for (const index of ['orders/_doc', '_bulk', 'orders,_doc', 'orders?refresh=true']) {
    expect(await opensearchSearch(conn, { index, query: { match_all: {} } })).toMatchObject({
      ok: false,
      code: 'INVALID_INDEX'
    });
  }
  expect(await opensearchCount(conn, { index: 'orders' })).toMatchObject({ ok: true, data: { count: 2 } });
  expect(await opensearchGet(conn, { index: 'orders', id: '_search' })).toEqual({
    ok: false,
    error: 'OpenSearch answered 404: document not found',
    code: 'HTTP_404'
  });
});

test('an OpenSearch error names the status and the reason', async () => {
  expect(await opensearchMapping(conn, { index: 'missing' })).toEqual({
    ok: false,
    error: 'OpenSearch answered 404: no such index [missing]',
    code: 'index_not_found_exception'
  });
});

test('an IAM denial from AWS names the status and its message instead of "Unknown error"', async () => {
  const message = 'User: arn:aws:sts::111111111111:assumed-role/shop-dev-debug-agent/x is not authorized';
  const server = Bun.serve({ port: 0, fetch: () => Response.json({ Message: message }, { status: 403 }) });
  try {
    expect(await opensearchIndices({ mode: 'local', port: server.port! })).toEqual({
      ok: false,
      error: `OpenSearch answered 403: ${message}`,
      code: 'ACCESS_DENIED'
    });
  } finally {
    server.stop(true);
  }
});
