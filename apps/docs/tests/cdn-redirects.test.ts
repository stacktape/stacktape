import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { mock, test } from 'node:test';
import { runInNewContext } from 'node:vm';
import { CloudFrontKeyValueStoreClient } from '@aws-sdk/client-cloudfront-keyvaluestore';
import {
  buildRedirectStoreEntries,
  CLOUDFRONT_FUNCTION_MAX_BYTES,
  planRedirectStoreUpdates,
  REDIRECT_FUNCTION_BODY,
  REDIRECT_FUNCTION_CODE,
  REDIRECT_FUNCTION_IMPORT
} from '../src/build/cdn-redirects.ts';
import { respondToStackEvent, type RedirectStoreProperties } from '../src/build/redirect-store-sync.ts';
import { CDN_REDIRECTS } from '../src/utils/site-redirects.ts';

type QueryString = Record<string, { value: string; multiValue?: { value: string }[] }>;
type ViewerRequest = { uri: string; querystring: QueryString };
type Redirect = { statusCode: number; headers: Record<string, { value: string }> };
type Handler = (event: { request: ViewerRequest }) => Promise<ViewerRequest | Redirect>;

// The handler logs what it wrote and why it failed; the tests check its responses instead.
mock.method(console, 'info', () => {});
mock.method(console, 'error', () => {});

const STORE_ARN = 'arn:aws:cloudfront::123456789012:key-value-store/2f1e3a4b-5c6d-4e7f-8a9b-0c1d2e3f4a5b';

/** An HTTP response of the KeyValueStore REST API. */
const json = (statusCode: number, body: unknown, headers: Record<string, string> = {}) => ({
  response: {
    statusCode,
    headers: { 'content-type': 'application/json', ...headers },
    body: new TextEncoder().encode(JSON.stringify(body))
  }
});

/**
 * A KeyValueStore behind the real SDK client: the client builds and signs each request, and this answers it the way the
 * service's REST API does (`If-Match` versions, at most 50 keys per update, pages of keys).
 */
const createFakeStore = (initial: Record<string, string> = {}) => {
  const keys = new Map(Object.entries(initial));
  let version = 1;
  const updates: { puts: number; deletes: number }[] = [];
  const signatures = new Set<string>();
  const handle = async (request: {
    method: string;
    path: string;
    query?: Record<string, string | string[] | null>;
    headers: Record<string, string>;
    body?: string;
  }) => {
    signatures.add(`${request.headers.authorization?.split(' ')[0]} region-set=${request.headers['x-amz-region-set']}`);
    const [, arn, keysPath] = request.path.match(/^\/key-value-stores\/([^/]+)(\/keys)?$/) ?? [];
    if (decodeURIComponent(arn ?? '') !== STORE_ARN) return json(404, { Message: 'No such store' });
    const etag = { etag: `E${version}` };
    if (request.method === 'GET' && !keysPath) {
      return json(200, { ItemCount: keys.size, TotalSizeInBytes: 0, KvsARN: STORE_ARN, Created: 0 }, etag);
    }
    if (request.method === 'GET') {
      const pageSize = Number(request.query?.MaxResults ?? 10);
      const start = Number(request.query?.NextToken ?? 0);
      const items = [...keys].slice(start, start + pageSize).map(([Key, Value]) => ({ Key, Value }));
      const next = start + pageSize < keys.size ? { NextToken: String(start + pageSize) } : {};
      return json(200, { Items: items, ...next });
    }
    const { Puts = [], Deletes = [] } = JSON.parse(request.body ?? '{}') as {
      Puts?: { Key: string; Value: string }[];
      Deletes?: { Key: string }[];
    };
    if (request.headers['if-match'] !== `E${version}`) {
      return json(409, { Message: 'The store changed' }, { 'x-amzn-errortype': 'ConflictException' });
    }
    if (Puts.length + Deletes.length > 50) {
      return json(400, { Message: 'Too many keys' }, { 'x-amzn-errortype': 'ValidationException' });
    }
    for (const { Key } of Deletes) keys.delete(Key);
    for (const { Key, Value } of Puts) keys.set(Key, Value);
    version += 1;
    updates.push({ puts: Puts.length, deletes: Deletes.length });
    return json(200, { ItemCount: keys.size, TotalSizeInBytes: 0 }, { etag: `E${version}` });
  };
  const client = new CloudFrontKeyValueStoreClient({
    region: 'eu-west-1',
    credentials: { accessKeyId: 'AKIDEXAMPLE', secretAccessKey: 'not-a-secret' },
    requestHandler: { handle }
  });
  return {
    client,
    keys,
    updates,
    signatures,
    /** Somebody else edits the store. */
    touch: () => {
      version += 1;
    }
  };
};

/** Receives the response the handler PUTs to CloudFormation's presigned URL. */
const withResponseUrl = async <T>(run: (url: string) => Promise<T>) => {
  const responses: { Status: string; Reason: string; PhysicalResourceId: string }[] = [];
  const server = createServer((request, response) => {
    let body = '';
    request.on('data', (chunk) => (body += chunk));
    request.on('end', () => {
      responses.push(JSON.parse(body));
      response.end();
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const { port } = server.address() as AddressInfo;
    await run(`http://127.0.0.1:${port}/response`);
    return responses;
  } finally {
    server.close();
  }
};

const stackEvent = (
  requestType: 'Create' | 'Update' | 'Delete',
  redirects: Record<string, string>,
  responseUrl: string
) => {
  const properties: RedirectStoreProperties = { storeArn: STORE_ARN, redirects: Object.entries(redirects) };
  return {
    RequestType: requestType,
    ResponseURL: responseUrl,
    StackId: 'arn:aws:cloudformation:eu-west-1:123456789012:stack/docs-production/1',
    RequestId: 'request-1',
    LogicalResourceId: 'RedirectStoreCustomResource',
    PhysicalResourceId: requestType === 'Create' ? undefined : STORE_ARN,
    ResourceProperties: properties
  };
};

/** Runs the deployed function code with the `cloudfront` module the runtime gives it, backed by `store`. */
const loadFunction = (store: Map<string, string> | 'unavailable'): Handler => {
  const cf = {
    kvs: () => ({
      get: async (key: string) => {
        if (store === 'unavailable') throw new Error('KeyValueStore read failed');
        if (!store.has(key)) throw new Error(`The key ${key} does not exist.`);
        return store.get(key);
      }
    })
  };
  return runInNewContext(`${REDIRECT_FUNCTION_BODY}; handler`, { cf }) as Handler;
};

const request = (uri: string, querystring: QueryString = {}): ViewerRequest => ({ uri, querystring });

const entries = buildRedirectStoreEntries(CDN_REDIRECTS);

test('the redirect function is the import and the handler, small and without redirect data', () => {
  assert.equal(REDIRECT_FUNCTION_CODE, `${REDIRECT_FUNCTION_IMPORT}\n${REDIRECT_FUNCTION_BODY}`);
  assert.equal(REDIRECT_FUNCTION_IMPORT, "import cf from 'cloudfront';");
  assert.ok(Buffer.byteLength(REDIRECT_FUNCTION_CODE) < CLOUDFRONT_FUNCTION_MAX_BYTES / 8);
  for (const from of Object.keys(entries)) assert.ok(!REDIRECT_FUNCTION_CODE.includes(`'${from}'`), from);
});

test('the deploy fills an empty store, and the function answers every redirect from it with a 301', async () => {
  const store = createFakeStore();
  const responses = await withResponseUrl((url) =>
    respondToStackEvent(stackEvent('Create', entries, url), store.client)
  );
  assert.deepEqual(
    responses.map(({ Status, PhysicalResourceId }) => ({ Status, PhysicalResourceId })),
    [{ Status: 'SUCCESS', PhysicalResourceId: STORE_ARN }]
  );
  assert.deepEqual(Object.fromEntries(store.keys), entries);
  assert.ok(store.updates.every(({ puts, deletes }) => puts + deletes <= 50));
  assert.equal(store.updates.length, Math.ceil(Object.keys(entries).length / 50));
  assert.deepEqual([...store.signatures], ['AWS4-ECDSA-P256-SHA256 region-set=*']);

  const handler = loadFunction(store.keys);
  const cases = Object.entries(CDN_REDIRECTS).flatMap(([from, to]) =>
    [from, from.replace(/\/$/, '')].map((uri) => ({ uri, to }))
  );
  const answers = await Promise.all(cases.map(({ uri }) => handler({ request: request(uri) })));
  cases.forEach(({ uri, to }, index) => {
    const response = answers[index] as Redirect;
    assert.equal(response.statusCode, 301, uri);
    assert.equal(response.headers.location.value, to, uri);
    assert.equal(response.headers['cache-control'].value, 'public, max-age=3600', uri);
  });
});

test('a later deploy changes only the redirects that changed, and a rollback writes the old table back', async () => {
  const store = createFakeStore(entries);
  const [firstFrom] = Object.keys(entries);
  const changed = { ...entries, [firstFrom!]: '/getting-started/', '/new/old-page': '/new/page/' };
  delete changed[Object.keys(entries)[1]!];
  await withResponseUrl((url) => respondToStackEvent(stackEvent('Update', changed, url), store.client));
  assert.deepEqual(Object.fromEntries(store.keys), changed);
  assert.deepEqual(store.updates, [{ puts: 2, deletes: 1 }]);

  await withResponseUrl((url) => respondToStackEvent(stackEvent('Update', entries, url), store.client));
  assert.deepEqual(Object.fromEntries(store.keys), entries);

  await withResponseUrl((url) => respondToStackEvent(stackEvent('Update', entries, url), store.client));
  assert.equal(store.updates.length, 2, 'an unchanged table writes nothing');
});

test('an edit made during the sync fails the deploy instead of being overwritten', async () => {
  const store = createFakeStore();
  const original = store.client.send.bind(store.client);
  let calls = 0;
  store.client.send = ((command: Parameters<typeof original>[0]) => {
    calls += 1;
    if (calls === 2) store.touch();
    return original(command);
  }) as typeof store.client.send;
  const responses = await withResponseUrl((url) =>
    respondToStackEvent(stackEvent('Create', entries, url), store.client)
  );
  assert.equal(responses[0]?.Status, 'FAILED');
  assert.match(responses[0]?.Reason ?? '', /ConflictException/);
  assert.equal(store.keys.size, 0);
});

test('deleting the resource leaves the store to CloudFormation', async () => {
  const store = createFakeStore(entries);
  const responses = await withResponseUrl((url) =>
    respondToStackEvent(stackEvent('Delete', entries, url), store.client)
  );
  assert.deepEqual(
    responses.map(({ Status, PhysicalResourceId }) => ({ Status, PhysicalResourceId })),
    [{ Status: 'SUCCESS', PhysicalResourceId: STORE_ARN }]
  );
  assert.equal(store.signatures.size, 0, 'no store request');
});

test('the redirect keeps the query string', async () => {
  const handler = loadFunction(new Map(Object.entries(entries)));
  const response = (await handler({
    request: request('/compute-resources/functions', {
      utm_source: { value: 'blog' },
      tag: { value: 'a', multiValue: [{ value: 'a' }, { value: 'b' }] },
      flag: { value: '' }
    })
  })) as Redirect;
  assert.equal(response.headers.location.value, '/resources/compute/lambda-function/?utm_source=blog&tag=a&tag=b&flag');
});

test('other requests, and every request while the store cannot be read, pass through unchanged', async () => {
  const uris = ['/', '/resources/compute/lambda-function/', '/v3/compute-resources/functions/', '/llms.txt'];
  const cases = [loadFunction(new Map(Object.entries(entries))), loadFunction('unavailable')].flatMap((handler) =>
    uris.map((uri) => ({ handler, original: request(uri) }))
  );
  const results = await Promise.all(cases.map(({ handler, original }) => handler({ request: original })));
  results.forEach((result, index) => assert.equal(result, cases[index]!.original, cases[index]!.original.uri));
});

test('the store table fails the build when it breaks a store quota or a target is not a page or a file', () => {
  assert.throws(() => buildRedirectStoreEntries({ [`/${'a'.repeat(600)}/`]: '/b/' }), /keys up to 512/);
  assert.throws(() => buildRedirectStoreEntries({ '/a/': `/${'b'.repeat(1100)}/` }), /values up to 1 KB/);
  assert.throws(() => buildRedirectStoreEntries({ '/a/': '/b' }), /must be a page ending with a slash or a file/);
  assert.throws(() => buildRedirectStoreEntries({ '/a/': '/b/', '/a': '/c/' }), /redirects to both/);
  assert.deepEqual(buildRedirectStoreEntries({ '/sitemap.xml': '/sitemap-index.xml', '/a/': '/b/' }), {
    '/sitemap.xml': '/sitemap-index.xml',
    '/a': '/b/'
  });
});

test('store updates hold at most 50 keys, deletes first', () => {
  const current = Object.fromEntries(Array.from({ length: 60 }, (_, index) => [`/old/${index}`, '/x/']));
  const wanted = Object.fromEntries(Array.from({ length: 70 }, (_, index) => [`/new/${index}`, '/y/']));
  const updates = planRedirectStoreUpdates({ ...current, '/same': '/z/' }, { ...wanted, '/same': '/z/' });
  assert.deepEqual(
    updates.map(({ deletes, puts }) => [deletes.length, puts.length]),
    [
      [50, 0],
      [10, 40],
      [0, 30]
    ]
  );
});
