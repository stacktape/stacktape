import { expect, test } from 'bun:test';
import { editorVersion } from './editor-version';

test('the panel version comes from ?editor, e1 when absent or unknown', () => {
  expect(editorVersion('')).toBe('e1');
  expect(editorVersion('?editor=E2')).toBe('e2');
  expect(editorVersion('?start=g2&editor=e3')).toBe('e3');
  expect(editorVersion('?editor=split')).toBe('e1');
});
