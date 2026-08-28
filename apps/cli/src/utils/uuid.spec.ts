import { describe, expect, test } from 'bun:test';
import { generateShortUuid, generateUuid } from './uuid';

describe('native UUID generation', () => {
  test('preserves the persisted system UUIDv4 contract', () => {
    expect(generateUuid()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  test('keeps invocation suffixes short and path-safe', () => {
    expect(generateShortUuid()).toMatch(/^[1-9a-km-zA-HJ-NP-Z]{22}$/);
  });
});
