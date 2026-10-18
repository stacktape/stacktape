import { expect, test } from 'bun:test';
import { canUpdateSharedLayersFirst } from './shared-layer-compatibility';
const files = (root: string, entries: Record<string, string>) =>
  new Map(Object.entries(entries).map(([path, code]) => [`${root}/${path}`, Buffer.from(code)]));
const entry = (name: string) =>
  files('/var/task', {
    'index.js': `import { ${name} as helper } from '/opt/nodejs/chunks/chunk-a.js'; export const handler = () => helper();`
  });
const layer = (code: string) => files('/opt/nodejs/chunks', { 'chunk-a.js': code });
const compatible = (oldCode: string, nextCode: string, oldName = 'helper', nextName = 'helper') =>
  canUpdateSharedLayersFirst({
    oldFunction: entry(oldName),
    nextFunction: entry(nextName),
    oldLayers: layer(oldCode),
    nextLayers: layer(nextCode)
  });
test('mixed edits link across both generations, with renamed local symbols and quoted export aliases', () => {
  expect(
    compatible('const old = () => 1; export { old as helper };', 'const next = () => 2; export { next as "helper" };')
  ).toBe(true);
});
test('adding a used export, removing one, or changing an exported name requires a bridge', () => {
  expect(
    compatible(
      'export const helper = () => 1;',
      'export const helper = () => 2; export const added = () => 3;',
      'helper',
      'added'
    )
  ).toBe(false);
  expect(compatible('export const helper = () => 1;', 'export const renamed = () => 2;', 'helper', 'renamed')).toBe(
    false
  );
  expect(
    compatible('export const helper = () => 1; export const removed = 2;', 'export const helper = () => 3;', 'removed')
  ).toBe(false);
});
test('chunk-to-chunk and local chunk dependencies must resolve too', () => {
  const oldLayers = files('/opt/nodejs/chunks', {
    'chunk-a.js': 'import { value } from "./chunk-b.js"; export const helper = () => value;',
    'chunk-b.js': 'export const value = 1;'
  });
  const nextLayers = files('/opt/nodejs/chunks', { 'chunk-a.js': 'export const helper = () => 2;' });
  expect(
    canUpdateSharedLayersFirst({ oldFunction: entry('helper'), nextFunction: entry('helper'), oldLayers, nextLayers })
  ).toBe(true);
  const nextFunction = files('/var/task', {
    'index.js': 'import { missing } from "./chunks/local.js";',
    'chunks/local.js': 'export const other = 1;'
  });
  expect(canUpdateSharedLayersFirst({ oldFunction: entry('helper'), nextFunction, oldLayers, nextLayers })).toBe(false);
});
test.each([
  'export * from "./chunk-b.js";',
  'const x = import("./chunk-b.js"); export const helper = () => x;',
  'import * as x from "./chunk-b.js"; export const helper = () => x;',
  'const helper = require(path); export { helper };'
])('uncertain module linkage keeps the bridge: %s', (code) => {
  expect(compatible('export const helper = () => 1;', code)).toBe(false);
});

test('literal dynamic imports and namespace imports are safe only with identical export sets', () => {
  for (const code of [
    'export const helper = () => import("./chunk-b.js");',
    'import * as deferred from "./chunk-b.js"; export const helper = () => deferred.value;'
  ]) {
    const oldLayers = files('/opt/nodejs/chunks', { 'chunk-a.js': code, 'chunk-b.js': 'export const value = 1;' });
    const nextLayers = files('/opt/nodejs/chunks', { 'chunk-a.js': code, 'chunk-b.js': 'export const value = 2;' });
    const check = () =>
      canUpdateSharedLayersFirst({
        oldFunction: entry('helper'),
        nextFunction: entry('helper'),
        oldLayers,
        nextLayers
      });
    expect(check()).toBe(true);
    nextLayers.set('/opt/nodejs/chunks/chunk-b.js', Buffer.from('export const renamed = 2;'));
    expect(check()).toBe(false);
  }
});
