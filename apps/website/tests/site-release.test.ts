import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';
import { runInNewContext } from 'node:vm';
import { redirectFunctionCode } from '../src/build/redirects.ts';
import redirects from '../src/build/site-redirects.json' with { type: 'json' };
import oldUrls from './old-urls.json' with { type: 'json' };

type Query = Record<string, { value: string; multiValue?: { value: string }[] }>;
type Request = { uri: string; querystring: Query };
type Redirect = { statusCode: number; headers: { location: { value: string } } };
const handle = runInNewContext(`${redirectFunctionCode()}; handler`) as (event: {
  request: Request;
}) => Request | Redirect;
const responseFor = (uri: string, querystring: Query = {}) => handle({ request: { uri, querystring } });

const directory = mkdtempSync(join(tmpdir(), 'stacktape-website-'));
const pageExists = (pathname: string) =>
  existsSync(join(directory, pathname, 'index.html')) ||
  (/\.[^/]+$/.test(pathname) && existsSync(join(directory, pathname)));

before(() => {
  execFileSync('pnpm', ['exec', 'astro', 'build', '--outDir', directory], {
    env: { ...process.env, STACKTAPE_WEBSITE_STAGE: 'production' },
    stdio: 'pipe'
  });
});
after(() => rmSync(directory, { recursive: true, force: true }));

test('every v3 URL has a public page or a permanent redirect to a valid destination', () => {
  for (const { url } of oldUrls) {
    const { pathname } = new URL(url);
    const response = responseFor(pathname);
    if ('statusCode' in response) {
      assert.equal(response.statusCode, 301, pathname);
    } else {
      assert.ok(pageExists(pathname), pathname);
    }
  }
  for (const [pathname, destination] of Object.entries(redirects)) {
    for (const uri of [pathname, `${pathname}/`]) {
      const response = responseFor(uri);
      assert.ok('statusCode' in response, uri);
      assert.equal(response.statusCode, 301, uri);
      assert.equal(response.headers.location.value, destination, uri);
    }
    const target = new URL(destination, 'https://stacktape.com');
    if (target.hostname === 'stacktape.com') {
      assert.ok(pageExists(target.pathname), destination);
      assert.ok(!('statusCode' in responseFor(target.pathname)), destination);
    } else {
      assert.equal(target.origin, 'https://docs.stacktape.com');
    }
  }
});

test('the CDN keeps repeat, bare and encoded query parameters', () => {
  const response = responseFor('/careers/', {
    tag: { value: 'first', multiValue: [{ value: 'first' }, { value: 'two%20words' }] },
    flag: { value: '' }
  });
  assert.ok('statusCode' in response);
  assert.equal(response.headers.location.value, '/?tag=first&tag=two%20words&flag');
});

test('the former README and benchmarks addresses redirect to the homepage', () => {
  for (const pathname of ['readme', 'benchmarks']) {
    const html = readFileSync(join(directory, pathname, 'index.html'), 'utf8');
    assert.match(html, /<meta http-equiv="refresh" content="0;url=\/">/, pathname);
  }
});

test('the release excludes studies and publishes crawlable site files', () => {
  for (const excluded of ['d', 'hire', 'lens', 'session', 'sheet', 'stack', 'status', 'studies']) {
    assert.ok(!existsSync(join(directory, excluded)), excluded);
    assert.ok(!existsSync(join(directory, `${excluded}.html`)), excluded);
  }
  const sitemap = readFileSync(join(directory, 'sitemap.xml'), 'utf8');
  for (const page of ['/', '/pricing', '/blog', '/privacy-policy', '/terms-of-use']) {
    assert.match(sitemap, new RegExp(`<loc>https://stacktape\\.com${page === '/' ? '/' : page + '/?'}<\\/loc>`));
  }
  assert.doesNotMatch(sitemap, /\/(?:d|hire|lens|session|sheet|stack|status|studies|404)(?:\/|<)/);
  assert.match(readFileSync(join(directory, 'robots.txt'), 'utf8'), /Sitemap: https:\/\/stacktape\.com\/sitemap\.xml/);
  assert.match(readFileSync(join(directory, '404.html'), 'utf8'), /Page not found/);
});
