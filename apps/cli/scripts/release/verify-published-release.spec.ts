import { describe, expect, test } from 'bun:test';
import { assertInstalledCliVersion } from './verify-published-release';

describe('published release verification', () => {
  test('requires the launcher to report the exact immutable version', () => {
    expect(() => assertInstalledCliVersion('Stacktape version: 4.0.0-preview.1.\n', '4.0.0-preview.1')).not.toThrow();
    expect(() => assertInstalledCliVersion('Stacktape version: 4.0.0-preview.10.\n', '4.0.0-preview.1')).toThrow(
      'expected Stacktape version: 4.0.0-preview.1.'
    );
  });
});
