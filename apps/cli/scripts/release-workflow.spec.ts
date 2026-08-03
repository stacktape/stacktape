import { describe, expect, test } from 'bun:test';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { NIXPACKS_BINARY_FILE_NAMES } from 'src/config/constants';
import { BUN_COMPILE_TARGETS, OPENTUI_PLATFORM_IDENTIFIERS } from './release/build-cli-sources';
import { EXPECTED_RELEASE_ARCHIVES, verifyCandidateArchives } from './release/verify-candidate-assets';
import { parse as parseYaml } from 'yaml';

const readReleaseWorkflow = () =>
  readFile(join(process.cwd(), '..', '..', '.github', 'workflows', 'release.yml'), 'utf8');

const readCiWorkflow = () => readFile(join(process.cwd(), '..', '..', '.github', 'workflows', 'ci.yml'), 'utf8');

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

  test('keeps candidate runs artifact-only and isolates preview authority by job', async () => {
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
      expect.objectContaining({ type: 'choice', default: 'candidate', options: ['candidate', 'preview'] })
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
        expect(jobValue.if).toContain("inputs.channel == 'preview'");
        expect(typeof jobValue.environment).toBe('string');
      }
    }

    expect(privilegedJobNames.sort()).toEqual([
      'canary',
      'cleanup-canary',
      'cleanup-preview-publication',
      'publish-preview'
    ]);
    expect(isRecord(jobs.canary) && jobs.canary.permissions).toEqual({ contents: 'read', 'id-token': 'write' });
    expect(isRecord(jobs['cleanup-canary']) && jobs['cleanup-canary'].permissions).toEqual({
      contents: 'read',
      'id-token': 'write'
    });
    expect(isRecord(jobs['publish-preview']) && jobs['publish-preview'].permissions).toEqual({
      contents: 'write',
      'id-token': 'write'
    });
    expect(isRecord(jobs['cleanup-preview-publication']) && jobs['cleanup-preview-publication'].permissions).toEqual({
      contents: 'write'
    });
    for (const jobName of ['verify', 'build-binaries', 'assemble']) {
      expect(isRecord(jobs[jobName]) && jobs[jobName].permissions).toBeUndefined();
    }
  });

  test('publishes npm only after the public GitHub assets and launcher work', async () => {
    const workflow = await readReleaseWorkflow();
    const releaseIndex = workflow.indexOf('name: Create GitHub prerelease and upload exact candidate bytes');
    const publicVerificationIndex = workflow.indexOf('name: Verify public assets and npm launcher end to end');
    const npmPublishIndex = workflow.indexOf('name: Publish npm preview');

    expect(releaseIndex).toBeGreaterThan(-1);
    expect(publicVerificationIndex).toBeGreaterThan(releaseIndex);
    expect(npmPublishIndex).toBeGreaterThan(publicVerificationIndex);
    expect(workflow).toContain('npm publish __dist/stacktape-*.tgz --tag preview --provenance --access public');
    expect(workflow).toContain('-F prerelease=true');
    expect(workflow).toContain('-f make_latest=false');
    expect(workflow).toContain('target_commitish="$GITHUB_SHA"');
    expect(workflow).toContain('STP_AWS_CANARY_PROJECT_NAME: v4canary-${{ github.run_id }}-${{ github.run_attempt }}');
    expect(workflow).toContain('STP_AWS_CANARY_OWNER: github-${{ github.run_id }}-${{ github.run_attempt }}');
    expect(workflow.match(/name: Validate disposable AWS target/g)).toHaveLength(2);
    expect(workflow.match(/grep -Eq '\^\[0-9\]\{12\}\$'/g)).toHaveLength(2);
    expect(workflow.match(/allowed-account-ids: \$\{\{ vars\.STACKTAPE_PREVIEW_AWS_ACCOUNT_ID \}\}/g)).toHaveLength(2);
    expect(workflow).toContain("if: always() && steps.configure-aws.outcome == 'success'");
    expect(workflow).not.toContain('publish:install');
    expect(workflow).not.toContain('publish:schemas');
    expect(workflow).not.toContain('publish:llm');
  });

  test('keeps AWS and GitHub cleanup available after cancellation', async () => {
    const model = await readReleaseWorkflowModel();
    expect(isRecord(model.jobs)).toBe(true);
    const jobs = isRecord(model.jobs) ? model.jobs : {};
    const canaryCleanup = isRecord(jobs['cleanup-canary']) ? jobs['cleanup-canary'] : {};
    const publicationCleanup = isRecord(jobs['cleanup-preview-publication']) ? jobs['cleanup-preview-publication'] : {};

    expect(canaryCleanup.if).toContain('always()');
    expect(canaryCleanup.if).toContain("inputs.channel == 'preview'");
    expect(publicationCleanup.if).toContain('always()');
    expect(publicationCleanup.if).toContain("needs.publish-preview.result != 'success'");

    const workflow = await readReleaseWorkflow();
    expect(workflow).toContain('Preview owner: $PREVIEW_OWNER.');
    expect(workflow).toContain('grep -Fq "Preview owner: $PREVIEW_OWNER."');
    expect(workflow).toContain('GitHub release state is ambiguous; cleanup cannot report success:');
    expect(workflow).toContain('pnpm run test:real-aws-canary -- --cleanup-only');
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
    expect(workspaceBunVersion).toBe('1.3.14');
    expect(getWorkflowVersions({ workflow, key: 'bun-version' })).toEqual(
      Array.from({ length: 6 }, () => workspaceBunVersion)
    );
    expect(getWorkflowVersions({ workflow: await readCiWorkflow(), key: 'bun-version' })).toEqual([
      workspaceBunVersion
    ]);
  });
});
