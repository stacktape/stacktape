import { describe, expect, test } from 'bun:test';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
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

const readWorkspaceNodeVersion = async () =>
  (await readFile(join(process.cwd(), '..', '..', '.node-version'), 'utf8')).trim();

const getWorkflowVersions = ({ workflow, key }: { workflow: string; key: string }) =>
  [...workflow.matchAll(new RegExp(`^\\s+${key}:\\s*([^\\s#]+)`, 'gm'))].map((match) => match[1]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const readReleaseWorkflowModel = async () => {
  const parsed: unknown = parseYaml(await readReleaseWorkflow());
  if (!isRecord(parsed)) throw new Error('Release workflow must be a YAML object.');
  return parsed;
};

// Repository publication policy: these inspect authority and configured gates, not executable runtime behavior.
describe('release publication policy', () => {
  test('publication waits for installation of the exact candidate on native hosts', async () => {
    const model = await readReleaseWorkflowModel();
    const jobs = isRecord(model.jobs) ? model.jobs : {};
    const qualifier = isRecord(jobs['qualify-native']) ? jobs['qualify-native'] : {};
    const strategy = isRecord(qualifier.strategy) ? qualifier.strategy : {};
    const matrix = isRecord(strategy.matrix) ? strategy.matrix : {};
    expect(matrix.include).toEqual([
      { platform: 'linux', runner: 'ubuntu-24.04' },
      { platform: 'linux-arm', runner: 'ubuntu-24.04-arm' },
      { platform: 'macos', runner: 'macos-15-intel' },
      { platform: 'macos-arm', runner: 'macos-15' },
      { platform: 'win', runner: 'windows-2025' },
      { platform: 'win-arm', runner: 'windows-11-arm' }
    ]);
    expect(qualifier.needs).toBe('assemble');
    expect(isRecord(jobs.publish) && jobs.publish.needs).toEqual(['assemble', 'qualify-native']);
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

    expect(privilegedJobNames.sort()).toEqual([
      'cleanup-release-publication',
      'publish',
      'publish-installers',
      'recover'
    ]);
    expect(isRecord(jobs.publish) && jobs.publish.permissions).toEqual({
      contents: 'write',
      'id-token': 'write'
    });
    expect(isRecord(jobs['publish-installers']) && jobs['publish-installers'].permissions).toEqual({
      contents: 'read',
      'id-token': 'write'
    });
    expect(isRecord(jobs['cleanup-release-publication']) && jobs['cleanup-release-publication'].permissions).toEqual({
      contents: 'write',
      actions: 'read'
    });
    expect(isRecord(jobs.recover) && jobs.recover.permissions).toEqual({ contents: 'write', actions: 'read' });
    expect(isRecord(jobs.recover) && jobs.recover.environment).toBe('release-publish');
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
    expect(workflow).toContain('for attempt in $(seq 1 90)');
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
    expect(installerPublication.needs).toEqual(['publish', 'recover']);

    const workflow = await readReleaseWorkflow();
    expect(workflow).toContain('Release owner: $RELEASE_OWNER.');
    expect(workflow).toContain('grep -Fq "Release owner: $RELEASE_OWNER."');
    expect(workflow).toContain('GitHub release state is ambiguous; cleanup cannot report success:');
    expect(workflow).toContain('name: Upload and verify installer assets');
    expect(workflow).toContain("steps.npm-publish.outcome == 'skipped'");
    expect(workflow).toContain('npm publication was attempted; preserving its required GitHub assets.');
    expect(workflow).toContain('test "$actual_integrity" = "$expected_integrity"');
    expect(workflow).toContain('test "$selected_version" = "$RELEASE_VERSION"');
    expect(workflow).toContain('test "$tag_sha" = "$RECOVERY_SOURCE_SHA"');
  });

  test('pins every third-party action and toolchain version', async () => {
    const workflow = await readReleaseWorkflow();
    const actionUses = [...workflow.matchAll(/^\s+- uses: ([^\s#]+)/gm)].map((match) => match[1]);
    const workspaceBunVersion = await readWorkspaceBunVersion();
    const workspaceNodeVersion = await readWorkspaceNodeVersion();

    expect(actionUses.length).toBeGreaterThan(0);
    for (const action of actionUses) {
      expect(action).toMatch(/@[a-f0-9]{40}$/);
    }
    expect(workflow).toContain('version: 11.17.0');
    expect(workspaceNodeVersion).toMatch(/^\d+\.\d+\.\d+$/);
    expect(getWorkflowVersions({ workflow, key: 'node-version-file' })).toEqual(
      getWorkflowVersions({ workflow, key: 'node-version-file' }).map(() => '.node-version')
    );
    expect(getWorkflowVersions({ workflow: await readCiWorkflow(), key: 'node-version-file' })).toEqual([
      '.node-version'
    ]);
    expect(workspaceBunVersion).toBe('1.4.1');
    expect(getWorkflowVersions({ workflow, key: 'bun-version' })).toEqual(
      getWorkflowVersions({ workflow, key: 'bun-version' }).map(() => workspaceBunVersion)
    );
    expect(getWorkflowVersions({ workflow: await readCiWorkflow(), key: 'bun-version' })).toEqual([
      workspaceBunVersion
    ]);
  });
});
