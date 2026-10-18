import { expect, test } from 'bun:test';
import AdmZip from 'adm-zip';
import { buildSharedLayerTransitions, unzippedSize } from './shared-layer-transition';

const zip = (files: Record<string, string>) => {
  const archive = new AdmZip();
  for (const [name, value] of Object.entries(files)) archive.addFile(name, Buffer.from(value));
  return archive;
};
const arn = 'arn:aws:lambda:eu-west-1:123456789012:layer:chunks:1';
const entry = zip({ 'index.js': 'import { handler } from "/opt/nodejs/chunks/chunk-old.js"; export { handler };' });
const old = zip({
  'nodejs/package.json': '{"type":"module"}',
  'nodejs/chunks/chunk-old.js': 'import "/opt/nodejs/chunks/chunk-dependency.js"; export const handler = () => "old";',
  'nodejs/chunks/chunk-dependency.js': 'export const dependency = "old";',
  'nodejs/chunks/chunk-abandoned.js': 'export const abandoned = "interrupted deployment";'
});
const next = zip({
  'nodejs/package.json': '{"type":"module"}',
  'nodejs/chunks/chunk-new.js': 'export const handler = () => "new";'
});
const build = (functionZip = entry, current = old, nextZip = next) =>
  buildSharedLayerTransitions({
    functionZip,
    nextFunctionSize: 1024,
    currentLayers: [{ arn, zip: current }],
    nextLayers: [{ layerNumber: 1, layerName: 'chunks', zip: nextZip }]
  })[0]!;

test('a transition contains both module graphs and drops chunks abandoned by an interrupted deployment', () => {
  const transition = new AdmZip(build().zip);
  expect(
    transition
      .getEntries()
      .map(({ entryName }) => entryName)
      .sort()
  ).toEqual([
    'nodejs/chunks/chunk-dependency.js',
    'nodejs/chunks/chunk-new.js',
    'nodejs/chunks/chunk-old.js',
    'nodejs/package.json'
  ]);
  // Interrupt after the code switch, then deploy a third generation: only the second and third survive.
  const third = zip({ 'nodejs/chunks/chunk-third.js': 'export const handler = () => "third";' });
  const secondEntry = zip({ 'index.js': 'import "/opt/nodejs/chunks/chunk-new.js";' });
  const retried = new AdmZip(build(secondEntry, transition, third).zip);
  expect(
    retried
      .getEntries()
      .map(({ entryName }) => entryName)
      .sort()
  ).toEqual(['nodejs/chunks/chunk-new.js', 'nodejs/chunks/chunk-third.js']);
});

test('conflicting chunk contents fail before attachment', () => {
  const conflict = zip({ 'nodejs/chunks/chunk-old.js': 'export const incompatible = true;' });
  expect(() => build(entry, old, conflict)).toThrow('conflicting contents');
});

test('the layer budget and aggregate Lambda limit include transition overhead and unchanged user layers', () => {
  const large = zip({ 'nodejs/chunks/chunk-new.js': 'x'.repeat(50 * 1024 * 1024) });
  expect(() => build(entry, old, large)).toThrow('50 MB layer budget');
  const userLayer = zip({ 'user.dat': '' });
  userLayer.getEntries()[0]!.header.size = 250 * 1024 * 1024;
  expect(() =>
    buildSharedLayerTransitions({
      functionZip: entry,
      nextFunctionSize: 1024,
      currentLayers: [
        { arn, zip: old },
        { arn: 'arn:aws:lambda:eu-west-1:123456789012:layer:user:1', zip: userLayer }
      ],
      nextLayers: [{ layerNumber: 1, layerName: 'chunks', zip: next }]
    })
  ).toThrow('250 MB limit');
  expect(unzippedSize(entry)).toBeGreaterThan(0);
});
