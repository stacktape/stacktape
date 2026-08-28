import { describe, expect, test } from 'bun:test';
import { mkdtemp, readFile, rm, truncate, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { NIXPACKS_BINARY_FILE_NAMES } from 'src/config/constants';
import { BUN_COMPILE_TARGETS, OPENTUI_PLATFORM_IDENTIFIERS } from './release/build-cli-sources';
import {
  EXPECTED_RELEASE_ARCHIVES,
  MAX_RELEASE_ARCHIVE_BYTES,
  verifyCandidateArchives
} from './release/verify-candidate-assets';
import { parse as parseYaml } from 'yaml';

const readReleaseWorkflow = () =>
  readFile(join(process.cwd(), '..', '..', '.github', 'workflows', 'release.yml'), 'utf8');

const readCiWorkflow = () => readFile(join(process.cwd(), '..', '..', '.github', 'workflows', 'ci.yml'), 'utf8');

const readCliManifest = async () => {
  const manifest: unknown = JSON.parse(await readFile(join(process.cwd(), 'package.json'), 'utf8'));
  if (!isRecord(manifest)) throw new Error('CLI package.json must be an object.');
  return manifest;
};

const readWorkspaceBunVersion = async () => {
  const manifest: unknown = JSON.parse(await readFile(join(process.cwd(), '..', '..', 'package.json'), 'utf8'));
  if (!isRecord(manifest) || !isRecord(manifest.engines) || typeof manifest.engines.bun !== 'string') {
    throw new Error('Root package.json must declare the workspace Bun version.');
  }
  return manifest.engines.bun;
};

const getWorkflowVersions = ({ workflow, key }: { workflow: string; key: string }) =>
  [...workflow.matchAll(new RegExp(`^\\s+${key}:\\s*([^\\s#]+)`, 'gm'))].map((match) => match[1]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const readReleaseWorkflowModel = async () => {
  const parsed: unknown = parseYaml(await readReleaseWorkflow());
  if (!isRecord(parsed)) throw new Error('Release workflow must be a YAML object.');
  return parsed;
};

describe('release candidate workflow', () => {
  test('bundles both Linux libc variants for cross-compiled candidates', () => {
    expect(OPENTUI_PLATFORM_IDENTIFIERS.linux).toEqual(['linux-x64', 'linux-x64-musl']);
    expect(OPENTUI_PLATFORM_IDENTIFIERS.alpine).toEqual(['linux-x64', 'linux-x64-musl']);
    expect(OPENTUI_PLATFORM_IDENTIFIERS['linux-arm']).toEqual(['linux-arm64', 'linux-arm64-musl']);
    expect(BUN_COMPILE_TARGETS.alpine).toBe('bun-linux-x64-baseline-musl');
    expect(NIXPACKS_BINARY_FILE_NAMES.alpine).toBe('nixpacks-linux-alpine');
  });

  test('installs every supported OpenTUI native package as a direct optional dependency', async () => {
    const manifest = await readCliManifest();
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
    const npmPackIndex = workflow.indexOf('pnpm --dir ./__release-npm pack');
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
    expect(workflow).toContain("if: matrix.platform == 'alpine'");
    expect(workflow).toContain('apk add --no-cache libstdc++ libgcc gcompat');
    expect(workflow).toContain('/tmp/stacktape-candidate/stacktape --version');
    expect(workflow).toContain('/tmp/stacktape-candidate/nixpacks/nixpacks --version');
    expect(workflow).toContain('/tmp/stacktape-candidate/pack/pack version');
    expect(workflow).toContain('/tmp/stacktape-candidate/session-manager-plugin/smp --version');
    expect(workflow).toContain('FORCE_TTY=1 STP_DISABLE_TELEMETRY=1 STP_PRINT_UNHANDLED_ERROR=1');
    expect(workflow).toContain('timeout 3 /tmp/stacktape-candidate/stacktape');
  });

  test('isolates release and installer authority in protected jobs', async () => {
    const model = await readReleaseWorkflowModel();
    expect(model.permissions).toEqual({ contents: 'read' });
    expect(model.concurrency).toEqual({
      group: 'v4-release-${{ inputs.channel }}',
      'cancel-in-progress': false
    });

    expect(isRecord(model.on)).toBe(true);
    const dispatch = isRecord(model.on) && model.on.workflow_dispatch;
    expect(isRecord(dispatch)).toBe(true);
    const inputs = isRecord(dispatch) && dispatch.inputs;
    expect(isRecord(inputs)).toBe(true);
    const channel = isRecord(inputs) && inputs.channel;
    expect(channel).toEqual(
      expect.objectContaining({ type: 'choice', default: 'preview', options: ['preview', 'stable'] })
    );

    expect(isRecord(model.jobs)).toBe(true);
    const jobs = isRecord(model.jobs) ? model.jobs : {};
    const privilegedJobNames: string[] = [];
    for (const [jobName, jobValue] of Object.entries(jobs)) {
      expect(isRecord(jobValue)).toBe(true);
      if (!isRecord(jobValue)) continue;
      const permissions = isRecord(jobValue.permissions) ? jobValue.permissions : {};
      const steps = Array.isArray(jobValue.steps) ? jobValue.steps : [];
      const commands = steps
        .filter(isRecord)
        .map((step) => (typeof step.run === 'string' ? step.run : ''))
        .join('\n');
      const isPrivileged = permissions.contents === 'write' || permissions['id-token'] === 'write';
      const publishes = commands.includes('npm publish') || commands.includes('repos/$GITHUB_REPOSITORY/releases');
      if (isPrivileged || publishes) {
        privilegedJobNames.push(jobName);
        expect(typeof jobValue.environment).toBe('string');
      }
    }

    expect(privilegedJobNames.sort()).toEqual(['cleanup-release-publication', 'publish', 'publish-installers']);
    expect(isRecord(jobs.publish) && jobs.publish.permissions).toEqual({
      contents: 'write',
      'id-token': 'write'
    });
    expect(isRecord(jobs['publish-installers']) && jobs['publish-installers'].permissions).toEqual({
      contents: 'read',
      'id-token': 'write'
    });
    expect(isRecord(jobs['cleanup-release-publication']) && jobs['cleanup-release-publication'].permissions).toEqual({
      contents: 'write'
    });
    expect(isRecord(jobs.publish) && jobs.publish.environment).toBe('release-publish');
    expect(isRecord(jobs['cleanup-release-publication']) && jobs['cleanup-release-publication'].environment).toBe(
      'release-publish'
    );
    expect(isRecord(jobs['publish-installers']) && jobs['publish-installers'].environment).toBe('release-installers');
    for (const jobName of ['verify', 'build-binaries', 'assemble']) {
      expect(isRecord(jobs[jobName]) && jobs[jobName].permissions).toBeUndefined();
    }
  });

  test('publishes both channels without allowing either to move the other npm tag', async () => {
    const workflow = await readReleaseWorkflow();
    const releaseIndex = workflow.indexOf('name: Create GitHub release and upload exact candidate bytes');
    const publicVerificationIndex = workflow.indexOf('name: Verify public assets and npm launcher end to end');
    const npmPublishIndex = workflow.indexOf('name: Publish npm release');

    expect(releaseIndex).toBeGreaterThan(-1);
    expect(publicVerificationIndex).toBeGreaterThan(releaseIndex);
    expect(npmPublishIndex).toBeGreaterThan(publicVerificationIndex);
    expect(workflow).toContain('npm_tag=$([ "$RELEASE_CHANNEL" = preview ] && printf preview || printf latest)');
    expect(workflow).toContain('npm_tarballs=(./__dist/stacktape-*.tgz)');
    expect(workflow).toContain('Expected exactly one local npm tarball');
    expect(workflow).toContain('npm publish "${npm_tarballs[0]}" --tag "$npm_tag" --provenance --access public');
    expect(workflow).toContain('-F prerelease="$is_preview"');
    expect(workflow).toContain('-f make_latest="$make_latest"');
    expect(workflow).toContain('-f name="$RELEASE_VERSION"');
    expect(workflow).not.toContain('-f name="Stacktape $RELEASE_VERSION"');
    expect(workflow).toContain('target_commitish="$GITHUB_SHA"');
    expect(workflow).toContain('[ "$latest_after" = "$LATEST_BEFORE" ]');
    expect(workflow).toContain('[ "$preview_after" = "$PREVIEW_BEFORE" ]');
    expect(workflow).toContain('for attempt in $(seq 1 12)');
    expect(workflow).toContain('npm view stacktape dist-tags --json --prefer-online');
    expect(workflow).toContain('bun scripts/publish-install-scripts.ts');
    expect(workflow).toContain('allowed-account-ids: ${{ vars.STACKTAPE_RELEASE_AWS_ACCOUNT_ID }}');
    expect(workflow).toContain('vars.STACKTAPE_STABLE_INSTALLS_BUCKET_NAME');
    expect(workflow).toContain('vars.STACKTAPE_PREVIEW_INSTALLS_BUCKET_NAME');
    expect(workflow).toContain('Stable releases must be dispatched from main.');
    expect(workflow).toContain('npm install --global npm@11.16.0');
    expect(workflow).not.toContain('STACKTAPE_API_KEY');
    expect(workflow).not.toContain('test:real-aws-canary');
    expect(workflow).not.toContain('publish:schemas');
    expect(workflow).not.toContain('publish:llm');
  });

  test('keeps publication recovery separate from retryable installer publication', async () => {
    const model = await readReleaseWorkflowModel();
    expect(isRecord(model.jobs)).toBe(true);
    const jobs = isRecord(model.jobs) ? model.jobs : {};
    const installerPublication = isRecord(jobs['publish-installers']) ? jobs['publish-installers'] : {};
    const publicationCleanup = isRecord(jobs['cleanup-release-publication']) ? jobs['cleanup-release-publication'] : {};

    expect(publicationCleanup.if).toContain('always()');
    expect(publicationCleanup.if).toContain("needs.publish.result != 'success'");
    expect(installerPublication.needs).toBe('publish');

    const workflow = await readReleaseWorkflow();
    expect(workflow).toContain('Release owner: $RELEASE_OWNER.');
    expect(workflow).toContain('grep -Fq "Release owner: $RELEASE_OWNER."');
    expect(workflow).toContain('GitHub release state is ambiguous; cleanup cannot report success:');
    expect(workflow).toContain('name: Upload and verify installer assets');
  });

  test('pins every third-party action and toolchain version', async () => {
    const workflow = await readReleaseWorkflow();
    const actionUses = [...workflow.matchAll(/^\s+- uses: ([^\s#]+)/gm)].map((match) => match[1]);
    const workspaceBunVersion = await readWorkspaceBunVersion();

    expect(actionUses.length).toBeGreaterThan(0);
    for (const action of actionUses) {
      expect(action).toMatch(/@[a-f0-9]{40}$/);
    }
    expect(workflow).toContain('version: 11.17.0');
    expect(workflow).toContain('node-version: 24');
    expect(workspaceBunVersion).toBe('1.4.0');
    expect(getWorkflowVersions({ workflow, key: 'bun-version' })).toEqual(
      getWorkflowVersions({ workflow, key: 'bun-version' }).map(() => workspaceBunVersion)
    );
    expect(getWorkflowVersions({ workflow: await readCiWorkflow(), key: 'bun-version' })).toEqual([
      workspaceBunVersion
    ]);
  });
});
