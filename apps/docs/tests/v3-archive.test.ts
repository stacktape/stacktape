import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { test } from 'node:test';
import { entryToUrlSlug, slugToUrl } from '../src/utils/route-slugs.ts';
import { getV3PagePaths, toV3Href } from '../src/utils/v3-archive.ts';
import {
  V3_ARCHIVE_REDIRECTS,
  V3_REDIRECTS_TO_V4,
  V3_TO_V4,
  v3EquivalentOf,
  v4EquivalentOf
} from '../src/utils/v3-archive-routes.ts';
import { APP_ROOT } from './canonical-content.ts';

/**
 * The v3 archive is frozen content with its own contract: old v3 URLs keep resolving, links stay in
 * the archive, and its components cover what the pages use. Built-output rules (noindex, sitemap,
 * LLM corpus) are checked by `scripts/validate-built-site.ts`.
 */

const ARCHIVE_DIR = join(APP_ROOT, 'archive/v3/content');
const walk = (directory: string): string[] =>
  readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
const archiveFiles = walk(ARCHIVE_DIR).filter((path) => path.endsWith('.mdx'));

const v4Routes = new Set(
  readFileSync(join(APP_ROOT, 'tests/expected-routes.txt'), 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
);
const withSlash = (path: string) => (path === '/' ? '/' : `${path.replace(/\/$/, '')}/`);
const isV4Page = (url: string) => v4Routes.has(url === '/' ? '/' : url.replace(/[#?].*$/, '').replace(/\/$/, ''));

/** Literal keys of `redirects` in astro.config.mjs (the v3 maps are spread in and imported below). */
const configuredRedirects = (): Set<string> => {
  const source = readFileSync(join(APP_ROOT, 'astro.config.mjs'), 'utf8');
  const block = source.slice(source.indexOf('redirects: {'), source.indexOf('\n  },', source.indexOf('redirects: {')));
  return new Set([...block.matchAll(/^\s*'([^']+)':/gm)].map((match) => withSlash(match[1])));
};

test('the archive holds the 94 pages v3.7.1 served', () => {
  assert.equal(archiveFiles.length, 94);
  assert.equal(getV3PagePaths().size, 94);
  assert.ok(getV3PagePaths().has('/'));
  assert.ok(getV3PagePaths().has('/compute-resources/functions'));
});

test('every old v3 URL still resolves: as a v4 page, a redirect to v4, or a redirect into the archive', () => {
  const config = readFileSync(join(APP_ROOT, 'astro.config.mjs'), 'utf8');
  assert.match(
    config,
    /\.\.\.V3_REDIRECTS_TO_V4,\s*\.\.\.V3_ARCHIVE_REDIRECTS/,
    'astro.config.mjs must spread both v3 redirect maps'
  );
  const redirects = new Set([
    ...configuredRedirects(),
    ...Object.keys(V3_REDIRECTS_TO_V4),
    ...Object.keys(V3_ARCHIVE_REDIRECTS)
  ]);
  const unresolved = [...getV3PagePaths()].filter((path) => !isV4Page(path) && !redirects.has(withSlash(path)));
  assert.deepEqual(unresolved, []);
});

test('v3 redirects lead to pages this site builds, do not shadow v4 pages and do not overlap', () => {
  for (const from of Object.keys(V3_ARCHIVE_REDIRECTS))
    assert.ok(!(from in V3_REDIRECTS_TO_V4), `${from} is in both maps`);
  for (const [from, to] of Object.entries({ ...V3_REDIRECTS_TO_V4, ...V3_ARCHIVE_REDIRECTS })) {
    assert.ok(!isV4Page(from), `${from} is a v4 page and must not redirect`);
    const target = to.startsWith('/v3/') ? to.slice(3).replace(/\/$/, '') || '/' : undefined;
    assert.ok(target ? getV3PagePaths().has(target) : isV4Page(to), `${from} redirects to missing ${to}`);
  }
});

test('the v3 to v4 page map names real pages on both sides', () => {
  for (const [v3Path, v4Url] of Object.entries(V3_TO_V4)) {
    assert.ok(getV3PagePaths().has(v3Path), `${v3Path} is not a v3 page`);
    assert.ok(isV4Page(v4Url), `${v4Url} is not a v4 page`);
  }
  assert.equal(v4EquivalentOf('/compute-resources/functions/'), '/resources/compute/lambda-function/');
  assert.equal(v4EquivalentOf('/user-guides/migrating-from-heroku'), undefined);
  assert.equal(v3EquivalentOf('/resources/compute/lambda-function/'), '/v3/compute-resources/functions/');
  assert.equal(v3EquivalentOf('/'), '/v3/');
  assert.equal(v3EquivalentOf('/observability/tracing/'), undefined);
});

test('links in v3 content stay inside the archive', () => {
  const from = '/compute-resources/functions';
  assert.equal(toV3Href('/configuration/packaging', from), '/v3/configuration/packaging/');
  assert.equal(
    toV3Href('../../configuration/packaging.mdx#packaging-lambda-functions', from),
    '/v3/configuration/packaging/#packaging-lambda-functions'
  );
  assert.equal(toV3Href('https://docs.stacktape.com/cli/commands/deploy/', from), '/v3/cli/commands/deploy/');
  // Shared schema descriptions link relative to the page's directory.
  assert.equal(toV3Href('./web-services', '/compute-resources/batch-jobs'), '/v3/compute-resources/web-services/');
  // Links that were already dead in v3 go to the page on the same topic.
  assert.equal(toV3Href('/resources/secrets/', from), '/v3/security-resources/secrets/');
  assert.equal(toV3Href('#trigger-events', from), '#trigger-events');
  assert.equal(toV3Href('https://docs.aws.amazon.com/lambda/', from), 'https://docs.aws.amazon.com/lambda/');
  assert.equal(toV3Href('/v3/static/cdn/cdn.webp', from), '/v3/static/cdn/cdn.webp');
});

test('the v3 component map covers every component the archive uses, and nothing more', () => {
  const registry = readFileSync(join(APP_ROOT, 'src/components/v3/v3-mdx-components.tsx'), 'utf8');
  const body = registry.slice(registry.indexOf('  return {'), registry.lastIndexOf('  };'));
  const registered = new Set(
    [...body.matchAll(/^ {4}([A-Za-z][A-Za-z0-9]*)[,:]/gm)]
      .map((match) => match[1])
      .filter((name) => /^[A-Z]/.test(name))
  );
  // Explicit `<CodeBlock tabs>` goes to the shared island, added by the page.
  registered.add('CodeBlock');

  const used = new Set<string>();
  for (const file of archiveFiles) {
    const markup = readFileSync(file, 'utf8')
      .replace(/^\s*(`{3,}|~{3,})[\s\S]*?^\s*\1/gm, '')
      .replace(/`[^`\n]*`/g, '')
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
    for (const match of markup.matchAll(/<([A-Z][A-Za-z0-9]*)[\s/>]/g)) used.add(match[1]);
  }
  assert.deepEqual([...used].filter((name) => !registered.has(name)).toSorted(), []);
  assert.deepEqual([...registered].filter((name) => !used.has(name)).toSorted(), []);
});

test('archive pages keep v3 slugs under /v3/', () => {
  const routes = archiveFiles.map((file) =>
    slugToUrl(entryToUrlSlug(relative(ARCHIVE_DIR, file).replace(/\.mdx$/, '')))
  );
  assert.ok(routes.includes('/cli/commands'));
  assert.ok(routes.every((route) => /^\/(?:[a-z0-9-]+\/?)*$/.test(route)));
});
