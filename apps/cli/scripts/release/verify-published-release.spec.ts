import { describe, expect, test } from 'bun:test';
import { assertInstalledCliVersion } from './verify-published-release';

describe('published release verification', () => {
  test('requires the launcher to report the exact immutable version', () => {
    expect(() => assertInstalledCliVersion('Stacktape version: 4.0.0-preview.1.\n', '4.0.0-preview.1')).not.toThrow();
    expect(() => assertInstalledCliVersion('Stacktape version: 4.0.0-preview.10.\n', '4.0.0-preview.1')).toThrow(
      'expected Stacktape version: 4.0.0-preview.1.'
    );
  });

  test('reads the CLI version after a fresh launcher installation', () => {
    const output = `Installing Stacktape 4.0.0-preview.9 for linux-x64...
Downloading from GitHub releases...
Extracting...
Stacktape 4.0.0-preview.9 installed successfully!

\u001b[34m[i]\u001b[0m Stacktape version: \u001b[33m4.0.0-preview.9\u001b[0m.
[+] version completed (OK)
`;
    expect(() => assertInstalledCliVersion(output, '4.0.0-preview.9')).not.toThrow();
    expect(() => assertInstalledCliVersion(output, '4.0.0-preview.1')).toThrow();
  });

  test('rejects install messages without a CLI result and conflicting version reports', () => {
    expect(() =>
      assertInstalledCliVersion('Stacktape 4.0.0-preview.9 installed successfully!', '4.0.0-preview.9')
    ).toThrow();
    expect(() =>
      assertInstalledCliVersion(
        '[i] Stacktape version: 4.0.0-preview.9.\n[i] Stacktape version: 4.0.0-preview.8.',
        '4.0.0-preview.9'
      )
    ).toThrow();
  });
});
