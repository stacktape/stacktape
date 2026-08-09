import { expect, test } from 'bun:test';
import { getConfigEditorCapabilities } from './capabilities.js';

test('only YAML source can use browser analysis and one-way TypeScript conversion', () => {
  expect(getConfigEditorCapabilities('yaml')).toEqual({
    canConvertToTypescript: true,
    canRunWebAnalysis: true
  });
  expect(getConfigEditorCapabilities('typescript')).toEqual({
    canConvertToTypescript: false,
    canRunWebAnalysis: false
  });
});
