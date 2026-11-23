import assert from 'node:assert/strict';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import { buildRedirectFunctionCode, CLOUDFRONT_FUNCTION_MAX_BYTES } from '../src/build/cdn-redirects.ts';
import { SITE_REDIRECTS } from '../src/utils/site-redirects.ts';

type QueryString = Record<string, { value: string; multiValue?: { value: string }[] }>;
type ViewerRequest = { uri: string; querystring: QueryString };
type Redirect = { statusCode: number; headers: Record<string, { value: string }> };

const code = buildRedirectFunctionCode(SITE_REDIRECTS);
const handler = runInNewContext(`${code}; handler`) as (event: { request: ViewerRequest }) => ViewerRequest | Redirect;
const request = (uri: string, querystring: QueryString = {}): ViewerRequest => ({ uri, querystring });

test('the redirect function fits the CloudFront code limit with room for more redirects', () => {
  assert.ok(Buffer.byteLength(code) < CLOUDFRONT_FUNCTION_MAX_BYTES - 1024, `${Buffer.byteLength(code)} bytes`);
});

test('every site redirect is a 301 with and without the trailing slash', () => {
  for (const [from, to] of Object.entries(SITE_REDIRECTS)) {
    for (const uri of [from, from.replace(/\/$/, '')]) {
      const response = handler({ request: request(uri) }) as Redirect;
      assert.equal(response.statusCode, 301, uri);
      assert.equal(response.headers.location.value, to, uri);
    }
  }
});

test('the redirect keeps the query string', () => {
  const response = handler({
    request: request('/compute-resources/functions', {
      utm_source: { value: 'blog' },
      tag: { value: 'a', multiValue: [{ value: 'a' }, { value: 'b' }] },
      flag: { value: '' }
    })
  }) as Redirect;
  assert.equal(response.headers.location.value, '/resources/compute/lambda-function/?utm_source=blog&tag=a&tag=b&flag');
});

test('other requests pass through unchanged', () => {
  for (const uri of ['/', '/resources/compute/lambda-function/', '/v3/compute-resources/functions/', '/llms.txt']) {
    const original = request(uri);
    assert.equal(handler({ request: original }), original, uri);
  }
});

test('an oversized table fails the build instead of the deploy', () => {
  const huge = Object.fromEntries(Array.from({ length: 400 }, (_, index) => [`/old/page-${index}/`, `/new/${index}/`]));
  assert.throws(() => buildRedirectFunctionCode(huge), /CloudFront allows/);
});
