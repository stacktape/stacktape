import { describe, expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { prepareInstallAssets } from '../publish-install-scripts';

describe('published install scripts', () => {
  test('prepares exact versioned bytes and checksums for direct AWS publication', async () => {
    const assets = await prepareInstallAssets({ version: '4.0.0-preview.17' });

    expect(assets.map(({ key }) => key)).toEqual([
      '_data.json',
      'alpine.sh',
      'linux-arm.sh',
      'linux.sh',
      'macos-arm.sh',
      'macos.sh',
      'windows-arm.ps1',
      'windows.ps1'
    ]);
    for (const asset of assets) {
      expect(asset.body.toString()).toContain('4.0.0-preview.17');
      expect(asset.body.toString()).not.toContain('<<DEFAULT_VERSION>>');
      expect(asset.checksumSha256).toBe(createHash('sha256').update(asset.body).digest('base64'));
    }
    expect(assets.find(({ key }) => key === '_data.json')?.contentType).toBe('application/json');
    expect(assets.find(({ key }) => key === 'linux.sh')?.contentType).toBe('application/x-sh');
    expect(assets.find(({ key }) => key === 'windows.ps1')?.contentType).toBe('application/octet-stream');
    // Each path serves one of two scripts, which installs the build for the machine it runs on.
    const body = (key: string) => assets.find((asset) => asset.key === key)!.body.toString();
    for (const key of ['alpine.sh', 'linux-arm.sh', 'macos-arm.sh', 'macos.sh'])
      expect(body(key)).toBe(body('linux.sh'));
    expect(body('windows-arm.ps1')).toBe(body('windows.ps1'));
  });
});
