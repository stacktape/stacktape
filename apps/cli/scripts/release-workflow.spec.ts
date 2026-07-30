import { describe, expect, test } from 'bun:test';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { NIXPACKS_BINARY_FILE_NAMES } from '@shared/utils/constants';
import { BUN_COMPILE_TARGETS, OPENTUI_PLATFORM_IDENTIFIERS } from './release/build-cli-sources';
import { EXPECTED_RELEASE_ARCHIVES, verifyCandidateArchives } from './release/verify-candidate-assets';

const readReleaseWorkflow = () =>
  readFile(join(process.cwd(), '..', '..', '.github', 'workflows', 'release.yml'), 'utf8');

describe('release candidate workflow', () => {
  test('bundles both Linux libc variants for cross-compiled candidates', () => {
    expect(OPENTUI_PLATFORM_IDENTIFIERS.linux).toEqual(['linux-x64', 'linux-x64-musl']);
    expect(OPENTUI_PLATFORM_IDENTIFIERS.alpine).toEqual(['linux-x64', 'linux-x64-musl']);
    expect(OPENTUI_PLATFORM_IDENTIFIERS['linux-arm']).toEqual(['linux-arm64', 'linux-arm64-musl']);
    expect(BUN_COMPILE_TARGETS.alpine).toBe('bun-linux-x64-baseline-musl');
    expect(NIXPACKS_BINARY_FILE_NAMES.alpine).toBe('nixpacks-linux-alpine');
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

  test('builds the exact platform archive set and assembles a verified npm package', async () => {
    const workflow = await readReleaseWorkflow();

    for (const archive of EXPECTED_RELEASE_ARCHIVES) {
      expect(workflow).toContain(`archive: ${archive}`);
    }
    expect(workflow.match(/^\s+archive: /gm)).toHaveLength(EXPECTED_RELEASE_ARCHIVES.length);

    const archiveVerificationIndex = workflow.indexOf('bun scripts/release/verify-candidate-assets.ts');
    const checksumsIndex = workflow.indexOf('pnpm run release:checksums');
    const npmBuildIndex = workflow.indexOf('pnpm run build:npm');
    const npmVerifyIndex = workflow.indexOf('bun scripts/verify-npm-package.ts --require-checksums');
    const npmPackIndex = workflow.indexOf('npm pack __release-npm');
    const candidateUploadIndex = workflow.indexOf('name: Upload complete release candidate');

    expect(archiveVerificationIndex).toBeGreaterThan(-1);
    expect(checksumsIndex).toBeGreaterThan(archiveVerificationIndex);
    expect(npmBuildIndex).toBeGreaterThan(checksumsIndex);
    expect(npmVerifyIndex).toBeGreaterThan(npmBuildIndex);
    expect(npmPackIndex).toBeGreaterThan(npmVerifyIndex);
    expect(candidateUploadIndex).toBeGreaterThan(npmPackIndex);
    expect(workflow).toContain('pnpm run build:npm --version "$RELEASE_VERSION" --require-checksums');
    expect(workflow).not.toContain('pnpm run build:npm -- --version');
    expect(workflow).toContain('--require-checksums --expected-version "$RELEASE_VERSION"');
    expect(workflow).toContain('apps/cli/__dist/SHA256SUMS');
    expect(workflow).toContain('apps/cli/__dist/stacktape-*.tgz');
  });

  test('is artifact-only and has no publishing authority', async () => {
    const workflow = await readReleaseWorkflow();
    const forbiddenFragments = [
      'contents: write',
      'id-token: write',
      'npm publish',
      'npm stage',
      'create-github-release',
      'publish:install',
      'publish:schemas',
      'publish:llm',
      'git push',
      'git tag',
      'gh release'
    ];

    expect(workflow).toContain('permissions:\n  contents: read');
    expect(workflow).not.toContain('if: ${{ false }}');
    for (const fragment of forbiddenFragments) {
      expect(workflow).not.toContain(fragment);
    }
  });

  test('pins every third-party action and toolchain version', async () => {
    const workflow = await readReleaseWorkflow();
    const actionUses = [...workflow.matchAll(/^\s+- uses: ([^\s#]+)/gm)].map((match) => match[1]);

    expect(actionUses.length).toBeGreaterThan(0);
    for (const action of actionUses) {
      expect(action).toMatch(/@[a-f0-9]{40}$/);
    }
    expect(workflow).toContain('version: 11.17.0');
    expect(workflow).toContain('node-version: 24');
    expect(workflow).toContain('bun-version: 1.3.9');
  });
});
