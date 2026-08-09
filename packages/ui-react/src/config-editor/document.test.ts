import { expect, test } from 'bun:test';
import { detectConfigLanguage, shouldReplaceWithExternalContent } from './document.js';

test('detects the TypeScript module forms accepted by the config editor', () => {
  expect(
    detectConfigLanguage(`import { StacktapeConfig } from 'stacktape';\nexport default {} as StacktapeConfig;`)
  ).toBe('typescript');
  expect(detectConfigLanguage('export const config = {};')).toBe('typescript');
  expect(detectConfigLanguage('type Config = {};\nexport default {} satisfies Config;')).toBe('typescript');
});

test('keeps YAML and shell commands in YAML mode', () => {
  expect(detectConfigLanguage('resources:\n  api:\n    type: web-service')).toBe('yaml');
  expect(detectConfigLanguage('scripts:\n  start:\n    executeCommand: export PORT=3000 && bun start')).toBe('yaml');
  expect(detectConfigLanguage('')).toBe('yaml');
  expect(detectConfigLanguage()).toBe('yaml');
});

test('does not replace newer edits with a delayed save acknowledgement', () => {
  const pendingSaves = new Set(['first submitted snapshot', 'second submitted snapshot']);

  expect(
    shouldReplaceWithExternalContent({
      currentContent: 'edit made after save',
      externalContent: 'first submitted snapshot',
      pendingSaves
    })
  ).toBe(false);
  expect(
    shouldReplaceWithExternalContent({
      currentContent: 'edit made after save',
      externalContent: 'second submitted snapshot',
      pendingSaves
    })
  ).toBe(false);

  expect(
    shouldReplaceWithExternalContent({
      currentContent: 'local content',
      externalContent: 'new authoritative document',
      pendingSaves
    })
  ).toBe(true);
});
