import assert from 'node:assert/strict';
import test from 'node:test';
import { convertYamlToTypescript } from '../src/utils/yaml-to-typescript.ts';

test('documentation config tabs use the canonical converter', () => {
  const typescript = convertYamlToTypescript(`
resources:
  uploads:
    type: bucket
`);

  assert.match(typescript ?? '', /const uploads = new Bucket/);
  assert.match(typescript ?? '', /resources: \{ uploads \}/);
});

test('documentation fragments fail closed instead of breaking the page', () => {
  assert.equal(convertYamlToTypescript('not: [valid'), null);
});
