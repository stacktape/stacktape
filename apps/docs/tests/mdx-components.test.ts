import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { APP_ROOT, contentBodiesWithoutCodeFences } from './canonical-content.ts';

/**
 * The corpus and the component registry must agree in both directions.
 *
 * MDX already fails the build on a component it cannot resolve, so this test's job is to state the
 * inventory explicitly and to catch the other direction: a registration the corpus stopped using,
 * which would otherwise sit in the bundle forever.
 *
 * The registry is read as source text rather than imported because these tests run on plain Node,
 * which does not transform JSX.
 */

const REGISTRY_FILE = join(APP_ROOT, 'src/components/mdx-react-components.tsx');
const PAGE_FILE = join(APP_ROOT, 'src/pages/[...slug].astro');

/** Top-level keys of `export const reactMdxComponents = { ... }`. */
const registeredReactComponents = (): string[] => {
  const source = readFileSync(REGISTRY_FILE, 'utf8');
  const start = source.indexOf('export const reactMdxComponents = {');
  assert.notEqual(start, -1, 'could not find the reactMdxComponents object literal');
  const body = source.slice(source.indexOf('{', start) + 1, source.indexOf('\n};', start));

  return body
    .split('\n')
    .map((line) => line.match(/^ {2}([A-Za-z][A-Za-z0-9]*)\s*(?:[,:]|$)/)?.[1])
    .filter((name): name is string => Boolean(name));
};

/** Island wrappers merged into the component map by the catch-all page. */
const registeredIslands = (): string[] => {
  const source = readFileSync(PAGE_FILE, 'utf8');
  const start = source.indexOf('...reactMdxComponents,');
  assert.notEqual(start, -1, 'could not find the page component map');
  const body = source.slice(start, source.indexOf('\n};', start));
  return body
    .split('\n')
    .map((line) => line.trim().replace(/,$/, ''))
    .filter((name) => /^[A-Z][A-Za-z0-9]*$/.test(name));
};

/** Capitalized JSX element names used by the corpus, outside fenced code samples. */
const componentsUsedByContent = (): Set<string> => {
  const used = new Set<string>();
  for (const body of contentBodiesWithoutCodeFences()) {
    for (const match of body.matchAll(/<([A-Z][A-Za-z0-9]*)[\s/>]/g)) used.add(match[1]);
  }
  return used;
};

test('every component the corpus uses is registered', () => {
  const registered = new Set([...registeredReactComponents(), ...registeredIslands()]);
  const unresolved = [...componentsUsedByContent()].filter((name) => !registered.has(name)).toSorted();

  assert.deepEqual(unresolved, [], `content/ references components that nothing provides: ${unresolved.join(', ')}`);
});

test('every registered component is used by the corpus', () => {
  // HTML element overrides (lowercase keys) replace native tags and have no `<Name>` usage.
  const registered = [...registeredReactComponents(), ...registeredIslands()].filter((name) => /^[A-Z]/.test(name));
  const used = componentsUsedByContent();
  const unused = registered.filter((name) => !used.has(name)).toSorted();

  assert.deepEqual(unused, [], `these components are registered but unused by content/: ${unused.join(', ')}`);
});

test('the registry overrides the expected native elements', () => {
  const overrides = registeredReactComponents().filter((name) => /^[a-z]/.test(name));
  assert.deepEqual(overrides.toSorted(), ['img', 'table']);
});
