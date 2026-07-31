import assert from 'node:assert/strict';
import test from 'node:test';
import { convertTypescriptToYaml, convertYamlToTypescript } from '../src/utils/yaml-to-typescript.ts';

test('documentation config tabs use the canonical converter', () => {
  const typescript = convertYamlToTypescript(`
resources:
  uploads:
    type: bucket
`);

  assert.match(typescript ?? '', /const uploads = new Bucket/);
  assert.match(typescript ?? '', /resources: \{ uploads \}/);

  const yaml = convertTypescriptToYaml(typescript ?? '');
  assert.match(yaml ?? '', /uploads:/);
  assert.match(yaml ?? '', /type: bucket/);
});

test('documentation fragments fail closed instead of breaking the page', () => {
  assert.equal(convertYamlToTypescript('not: [valid'), null);
  assert.equal(convertTypescriptToYaml('const fragment: ='), null);
});
