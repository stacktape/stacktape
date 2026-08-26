import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { entryToUrlSlug, slugToUrl } from '../src/utils/route-slugs.ts';
import { APP_ROOT, contentFiles } from './canonical-content.ts';

/**
 * The published URL set is a customer-facing compatibility contract, so it is reviewed, not merely
 * derived. `tests/expected-routes.txt` is the checked-in list; renaming a page, adding one, or
 * dropping one fails here until a human updates that file in the same change.
 *
 * Derivation (`route-slugs.ts`) and the built-site validator both still run — they prove the build
 * emits what the corpus implies. Neither is the baseline; this manifest is.
 */

const MANIFEST_PATH = join(APP_ROOT, 'tests/expected-routes.txt');

const expectedRoutes = (): string[] =>
  readFileSync(MANIFEST_PATH, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

const derivedRoutes = (): string[] =>
  contentFiles()
    .map((file) => slugToUrl(entryToUrlSlug(file.replace(/\.mdx$/, ''))))
    .sort();

test('the corpus produces exactly the reviewed route set', () => {
  const expected = expectedRoutes();
  const derived = derivedRoutes();

  const missing = expected.filter((route) => !derived.includes(route));
  const unexpected = derived.filter((route) => !expected.includes(route));

  assert.deepEqual(missing, [], 'routes in the manifest that the corpus no longer produces');
  assert.deepEqual(unexpected, [], 'routes the corpus produces that the manifest does not list');
  assert.deepEqual(derived, expected, 'derived routes must equal the manifest exactly, in order');
});

test('the route manifest is sorted, unique, and human-reviewable', () => {
  const expected = expectedRoutes();

  assert.equal(expected.length, 201, 'the manifest must list every migrated page');
  assert.deepEqual(expected, expected.toSorted(), 'keep the manifest sorted so diffs stay readable');
  assert.equal(new Set(expected).size, expected.length, 'the manifest must not repeat a route');
  assert.ok(expected.includes('/'), 'the site root must be listed');
  for (const route of expected) {
    assert.match(route, /^\/(?:[a-z0-9]+(?:-[a-z0-9]+)*\/?)*$/, `route ${route} is not a stable lowercase slug`);
    assert.ok(!route.endsWith('/index'), `route ${route} kept its index segment`);
  }
});

test('slug derivation normalizes index files and separators', () => {
  assert.deepEqual(entryToUrlSlug('index'), []);
  assert.deepEqual(entryToUrlSlug('resources/compute/index'), ['resources', 'compute']);
  assert.deepEqual(entryToUrlSlug('cli/deploy'), ['cli', 'deploy']);
  assert.deepEqual(entryToUrlSlug('cli\\deploy'), ['cli', 'deploy']);
  assert.equal(slugToUrl([]), '/');
  assert.equal(slugToUrl(['cli', 'deploy']), '/cli/deploy');
});
