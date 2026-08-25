import { describe, expect, test } from 'bun:test';
import { HASHED_ASSET_DIRECTORY_BY_TYPE } from './ssr-webs';

describe('single-Lambda SSR web asset routing', () => {
  test('routes current TanStack Start Vite assets directly to the static bucket', () => {
    expect(HASHED_ASSET_DIRECTORY_BY_TYPE['tanstack-web']).toBe('assets');
  });
});
