import { describe, expect, test } from 'bun:test';
import { mkdtemp, rm, truncate, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { EXTERNAL_TOOL_MANIFEST } from 'src/utils/external-tools';
import { BUN_COMPILE_TARGETS, OPENTUI_PLATFORM_IDENTIFIERS } from './build-cli-sources';
import {
  EXPECTED_RELEASE_ARCHIVES,
  MAX_RELEASE_ARCHIVE_BYTES,
  verifyCandidateArchives
} from './verify-candidate-assets';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

describe('native candidate compatibility', () => {
  test('bundles both Linux libc variants for cross-compiled candidates', () => {
    expect(OPENTUI_PLATFORM_IDENTIFIERS.linux).toEqual(['linux-x64', 'linux-x64-musl']);
    expect(OPENTUI_PLATFORM_IDENTIFIERS.alpine).toEqual(['linux-x64', 'linux-x64-musl']);
    expect(OPENTUI_PLATFORM_IDENTIFIERS['linux-arm']).toEqual(['linux-arm64', 'linux-arm64-musl']);
    expect(BUN_COMPILE_TARGETS.alpine).toBe('bun-linux-x64-baseline-musl');
    expect(EXTERNAL_TOOL_MANIFEST.railpack.assets.alpine?.url).toEndWith('-x86_64-unknown-linux-musl.tar.gz');
  });

  test('installs every supported OpenTUI native package as a direct optional dependency', async () => {
    const manifest = JSON.parse(await readFile(join(process.cwd(), 'package.json'), 'utf8')) as Record<string, unknown>;
    expect(isRecord(manifest.dependencies)).toBe(true);
    expect(isRecord(manifest.optionalDependencies)).toBe(true);
    if (!isRecord(manifest.dependencies) || !isRecord(manifest.optionalDependencies)) return;

    const coreVersion = manifest.dependencies['@opentui/core'];
    const platformIds = new Set(Object.values(OPENTUI_PLATFORM_IDENTIFIERS).flat());
    for (const platformId of platformIds) {
      expect(manifest.optionalDependencies[`@opentui/core-${platformId}`]).toBe(coreVersion);
    }
  });

  test('requires the complete archive set with no unexpected platform archive', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'stacktape-release-candidate-'));

    try {
      await Promise.all(EXPECTED_RELEASE_ARCHIVES.map((fileName) => writeFile(join(directory, fileName), fileName)));
      expect(await verifyCandidateArchives(directory)).toEqual([...EXPECTED_RELEASE_ARCHIVES]);

      await rm(join(directory, 'linux-arm.tar.gz'));
      await expect(verifyCandidateArchives(directory)).rejects.toThrow('archive set mismatch');

      await writeFile(join(directory, 'linux-arm.tar.gz'), 'linux-arm');
      await writeFile(join(directory, 'unexpected.zip'), 'unexpected');
      await expect(verifyCandidateArchives(directory)).rejects.toThrow('archive set mismatch');
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  test('rejects an unexpectedly large release archive', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'stacktape-release-size-'));

    try {
      await Promise.all(EXPECTED_RELEASE_ARCHIVES.map((fileName) => writeFile(join(directory, fileName), fileName)));
      await truncate(join(directory, 'windows.zip'), MAX_RELEASE_ARCHIVE_BYTES['windows.zip'] + 1);
      await expect(verifyCandidateArchives(directory)).rejects.toThrow('reviewed ceiling');
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
