import { describe, expect, test } from 'bun:test';
import { validateReleaseInput } from './validate-release-input';

describe('release channel input', () => {
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

  test('accepts only plain SemVer versions for stable releases', () => {
    expect(validateReleaseInput({ channel: 'stable', version: '4.0.0' })).toEqual({
      channel: 'stable',
      version: '4.0.0'
    });
    expect(() => validateReleaseInput({ channel: 'stable', version: '4.0.0-preview.1' })).toThrow(
      'Stable releases must use a version such as 4.0.0'
    );
    expect(() => validateReleaseInput({ channel: 'stable', version: '4.0.0+rebuilt' })).toThrow(
      'Stable releases must use a version such as 4.0.0'
    );
  });

  test('rejects unknown channels and malformed versions', () => {
    expect(() => validateReleaseInput({ channel: 'latest', version: '4.0.0' })).toThrow('preview or stable');
    expect(() => validateReleaseInput({ channel: 'preview', version: 'v4' })).toThrow('valid SemVer');
    expect(() => validateReleaseInput({ channel: 'stable', version: 'v4.0.0' })).toThrow(
      'Stable releases must use a version such as 4.0.0'
    );
  });
});
