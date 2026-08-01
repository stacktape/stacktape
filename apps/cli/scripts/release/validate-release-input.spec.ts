import { describe, expect, test } from 'bun:test';
import { validateReleaseInput } from './validate-release-input';

describe('release channel input', () => {
  test('accepts an inspectable candidate without granting it publishing meaning', () => {
    expect(validateReleaseInput({ channel: 'candidate', version: '4.0.0-beta.1' })).toEqual({
      channel: 'candidate',
      version: '4.0.0-beta.1'
    });
    expect(validateReleaseInput({ channel: 'candidate', version: '4.0.0' }).channel).toBe('candidate');
  });

  test('requires preview versions to carry the preview prerelease identifier and sequence', () => {
    expect(validateReleaseInput({ channel: 'preview', version: '4.0.0-preview.12' })).toEqual({
      channel: 'preview',
      version: '4.0.0-preview.12'
    });
    expect(() => validateReleaseInput({ channel: 'preview', version: '4.0.0' })).toThrow('4.0.0-preview.1');
    expect(() => validateReleaseInput({ channel: 'preview', version: '4.0.0-beta.1' })).toThrow('4.0.0-preview.1');
    expect(() => validateReleaseInput({ channel: 'preview', version: '4.0.0-preview' })).toThrow('4.0.0-preview.1');
    expect(() => validateReleaseInput({ channel: 'preview', version: '4.0.0-preview.1+rebuilt' })).toThrow(
      '4.0.0-preview.1'
    );
  });

  test('rejects unknown channels and malformed versions', () => {
    expect(() => validateReleaseInput({ channel: 'latest', version: '4.0.0' })).toThrow('candidate or preview');
    expect(() => validateReleaseInput({ channel: 'candidate', version: 'v4' })).toThrow('valid SemVer');
  });
});
