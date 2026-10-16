import { describe, expect, test } from 'bun:test';
import { RAILPACK_FRONTEND_IMAGE, RAILPACK_VERSION } from './railpack';

describe('the pinned Railpack frontend', () => {
  test('is the frontend of the pinned release, pinned by digest', () => {
    // A digest lets BuildKit use the image from the local store without asking the registry what the tag names.
    expect(RAILPACK_FRONTEND_IMAGE).toMatch(
      new RegExp(
        `^ghcr\\.io/railwayapp/railpack-frontend:v${RAILPACK_VERSION.replaceAll('.', '\\.')}@sha256:[0-9a-f]{64}$`
      )
    );
  });
});
