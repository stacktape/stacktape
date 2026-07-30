import { expect, test } from 'bun:test';
import { isNodeBuiltinImport } from './module-specifier';

test('distinguishes Node builtin subpaths from trailing-slash package imports', () => {
  expect(isNodeBuiltinImport('fs/promises')).toBe(true);
  expect(isNodeBuiltinImport('node:stream/web')).toBe(true);
  expect(isNodeBuiltinImport('assert/strict')).toBe(true);
  expect(isNodeBuiltinImport('process/')).toBe(false);
});
