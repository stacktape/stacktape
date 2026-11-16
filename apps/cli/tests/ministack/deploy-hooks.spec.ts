import { expect, test } from 'bun:test';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CloudFormationClient, DescribeStacksCommand } from '@aws-sdk/client-cloudformation';
import { GetParameterCommand, SSMClient } from '@aws-sdk/client-ssm';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { startMiniStack } from '@stacktape/ministack/fixture';
// oxlint-disable-next-line import/no-unassigned-import
import './offline-preload';
import { STACK_LOCK_S3_KEY } from '../../src/domain/stack-operation-lock/lock';
import {
  createFamilyProject,
  describeStackResources,
  runSourceCli,
  runSourceCliCommand,
  writeProjectFiles,
  type FamilyProject
} from './harness';

type Hook = { scriptName: string; onFailure?: 'fail' | 'continue' };
type ResultRecord = {
  type?: string;
  ok?: boolean;
  code?: string;
  message?: string;
  data?: {
    failedHook?: { hookEvent: string; scriptName: string };
    hookFailures?: Array<{ hookEvent: string; scriptName: string }>;
    hints?: string[];
  };
};

// The source CLI deploys a real stack to the emulator; only the hook scripts are the test's own. A hook that fails
// after the deployment must fail the command, as a CI job sees it, without the deployment being reported, cleaned up
// or locked as a failed one.
test('a failed afterDeploy hook fails the deploy command and leaves the finished deployment as it is', async () => {
  const out = await mkdtemp(join(tmpdir(), 'stp-deploy-hooks-'));
  const ministack = await startMiniStack({ label: 'deploy-hooks' });
  const cloudFormation = new CloudFormationClient(ministack.clientConfig());
  const s3 = new S3Client(ministack.clientConfig());
  try {
    const project = await createFamilyProject({ familyName: 'deploy-hooks', out, ministack });
    const runsPath = join(project.directory, 'hook-runs.log');
    const hookRuns = async () => (await readFile(runsPath, 'utf8').catch(() => '')).split('\n').filter(Boolean);
    const script = (name: string, exitCode: number) => ({
      type: 'local-script',
      properties: { executeCommand: `${process.execPath} hook.mjs ${name} ${exitCode}` }
    });
    const config = (hooks: { beforeDeploy?: Hook[]; afterDeploy?: Hook[] }) => ({
      scripts: { first: script('first', 0), failing: script('failing', 3), last: script('last', 0) },
      hooks,
      resources: { bucket: { type: 'bucket' } }
    });
    const deploy = async (logName: string, hooks: Parameters<typeof config>[0]) => {
      await rm(runsPath, { force: true });
      await writeProjectFiles(project, { 'stacktape.yml': config(hooks) });
      const run = await runSourceCliCommand({
        project,
        ministack,
        logName,
        args: ['deploy', '--autoConfirmOperation', '--outputFormat', 'jsonl']
      });
      const result = run.stdout
        .split('\n')
        .filter((line) => line.startsWith('{'))
        .map((line) => JSON.parse(line) as ResultRecord)
        .findLast((record) => record.type === 'result');
      return { ...run, result, tail: `${run.stdout}\n${run.stderr}`.slice(-3000) };
    };
    const reportedEvents = (project: FamilyProject) =>
      project.controlPlane.calls
        .filter(({ procedure }) => procedure === 'reportEvent')
        .map(({ input }) => (input as { type: string }).type);
    const stackStatus = async () =>
      (await cloudFormation.send(new DescribeStacksCommand({ StackName: project.stackName }))).Stacks?.[0]?.StackStatus;
    let deployed = false;
    try {
      await writeProjectFiles(project, {
        'hook.mjs': `import { appendFileSync } from 'node:fs';
const [name, exitCode] = process.argv.slice(2);
appendFileSync(${JSON.stringify(runsPath)}, name + '\\n');
if (exitCode !== '0') console.error('hook ' + name + ' could not finish');
process.exit(Number(exitCode));
`
      });

      const failed = await deploy('failing-after-deploy', {
        afterDeploy: [{ scriptName: 'first' }, { scriptName: 'failing' }, { scriptName: 'last' }]
      });
      deployed = (await describeStackResources(cloudFormation, project.stackName)) !== undefined;
      expect(failed.exitCode, failed.tail).toBe(1);
      expect(failed.result).toMatchObject({
        ok: false,
        code: 'AFTER_DEPLOY_HOOK_FAILED',
        data: { failedHook: { hookEvent: 'afterDeploy', scriptName: 'failing' } }
      });
      expect(failed.result?.message).toContain('The deployment finished, but the afterDeploy hook failing failed.');
      expect(failed.result?.data?.hints?.join('\n')).toContain('onFailure: continue');
      // The hooks before it ran, the ones after it did not.
      expect(await hookRuns()).toEqual(['first', 'failing']);
      // The deployment itself stays what it is: complete, reported as succeeded, and no longer locked.
      expect(await stackStatus()).toBe('CREATE_COMPLETE');
      expect(reportedEvents(project)).toContain('DEPLOY_SUCCEEDED');
      // A second event tells the people who hear about failed deploys, and names the hook so the Console can say
      // that the release is live.
      const failedEvents = project.controlPlane.calls
        .filter(({ procedure }) => procedure === 'reportEvent')
        .map(({ input }) => input as { type: string; title: string; stackStatus?: string; details?: unknown })
        .filter(({ type }) => type === 'DEPLOY_FAILED');
      expect(failedEvents).toHaveLength(1);
      expect(failedEvents[0]).toMatchObject({
        title: `Deployed ${project.stackName}, but the afterDeploy hook failing failed`,
        stackStatus: 'CREATE_COMPLETE',
        details: { afterDeployHook: 'failing', error: expect.stringContaining('failing') }
      });
      // The operation record says both: the release is live, and the command failed on a hook.
      const recorded = project.controlPlane.calls
        .filter(({ procedure }) => procedure === 'recordStackOperation')
        .map(({ input }) => input as { inProgress?: boolean; success?: boolean; hookFailure?: string })
        .findLast(({ inProgress }) => inProgress === false);
      expect(recorded).toMatchObject({ success: true });
      expect(recorded?.hookFailure).toContain('The deployment finished, but the afterDeploy hook failing failed.');
      const lock = await s3.send(new GetObjectCommand({ Bucket: project.deploymentBucket, Key: STACK_LOCK_S3_KEY }));
      expect(JSON.parse(await lock.Body!.transformToString())).toMatchObject({ released: true });

      const continued = await deploy('continuing-hooks', {
        beforeDeploy: [{ scriptName: 'failing', onFailure: 'continue' }],
        afterDeploy: [{ scriptName: 'first' }, { scriptName: 'failing', onFailure: 'continue' }, { scriptName: 'last' }]
      });
      expect(continued.exitCode, continued.tail).toBe(0);
      expect(continued.result).toMatchObject({ ok: true });
      expect(
        project.controlPlane.calls
          .filter(({ procedure }) => procedure === 'recordStackOperation')
          .map(({ input }) => input as { inProgress?: boolean; success?: boolean; hookFailure?: string })
          .findLast(({ inProgress }) => inProgress === false)
      ).toEqual(expect.objectContaining({ success: true }));
      expect(JSON.stringify(project.controlPlane.calls.at(-1))).not.toContain('hookFailure');
      expect(continued.result?.data?.hookFailures).toMatchObject([
        { hookEvent: 'beforeDeploy', scriptName: 'failing' },
        { hookEvent: 'afterDeploy', scriptName: 'failing' }
      ]);
      expect(await hookRuns()).toEqual(['failing', 'first', 'failing', 'last']);
      expect(continued.stdout).toContain('The command continues, because the hook\'s onFailure is \\"continue\\"');

      const succeededBefore = reportedEvents(project).filter((type) => type === 'DEPLOY_SUCCEEDED').length;
      const stopped = await deploy('failing-before-deploy', {
        beforeDeploy: [{ scriptName: 'failing' }, { scriptName: 'first' }],
        afterDeploy: [{ scriptName: 'last' }]
      });
      expect(stopped.exitCode, stopped.tail).toBe(1);
      expect(stopped.result).toMatchObject({ ok: false });
      expect(stopped.result?.code).not.toBe('AFTER_DEPLOY_HOOK_FAILED');
      expect(await hookRuns()).toEqual(['failing']);
      expect(reportedEvents(project).filter((type) => type === 'DEPLOY_SUCCEEDED')).toHaveLength(succeededBefore);
    } finally {
      try {
        if (deployed) {
          await writeProjectFiles(project, { 'stacktape.yml': config({}) });
          const deleted = await runSourceCli({ project, step: 'delete', ministack });
          expect(deleted.exitCode, deleted.tail).toBe(0);
          expect(await describeStackResources(cloudFormation, project.stackName)).toBeUndefined();
        }
      } finally {
        await project.close();
      }
    }
  } finally {
    cloudFormation.destroy();
    s3.destroy();
    try {
      await ministack.stop();
    } finally {
      await rm(out, { recursive: true, force: true });
    }
  }
}, 420_000);

// Found in the v4 Console cutover rehearsal: a deploy without `--yes` ran its beforeDeploy hook (the database
// migration) and only then stopped to ask about a deleted bucket. Every question now comes before the hooks, so a run
// that cannot ask changes nothing: no hook, no created parameter, no stack update.
test('a deploy that needs confirmation and cannot ask stops before its beforeDeploy hooks and changes nothing', async () => {
  const out = await mkdtemp(join(tmpdir(), 'stp-deploy-confirm-'));
  const ministack = await startMiniStack({ label: 'deploy-confirm' });
  const cloudFormation = new CloudFormationClient(ministack.clientConfig());
  const ssm = new SSMClient(ministack.clientConfig());
  try {
    const project = await createFamilyProject({ familyName: 'deploy-confirm', out, ministack });
    const runsPath = join(project.directory, 'hook-runs.log');
    const missingParameter = '/stp-deploy-confirm/not-created-yet';
    const hookRuns = async () => (await readFile(runsPath, 'utf8').catch(() => '')).split('\n').filter(Boolean);
    const config = ({
      withData,
      referenceMissingParameter
    }: {
      withData: boolean;
      referenceMissingParameter?: boolean;
    }) => ({
      scripts: {
        migrate: { type: 'local-script', properties: { executeCommand: `${process.execPath} hook.mjs migrate` } }
      },
      hooks: { beforeDeploy: [{ scriptName: 'migrate' }] },
      ...(referenceMissingParameter
        ? { stackConfig: { outputs: [{ name: 'Setting', value: `$SsmParam('${missingParameter}')` }] } }
        : {}),
      resources: { kept: { type: 'bucket' }, ...(withData ? { data: { type: 'bucket' } } : {}) }
    });
    const deploy = async (logName: string, args: string[]) => {
      const run = await runSourceCliCommand({
        project,
        ministack,
        logName,
        args: ['deploy', '--outputFormat', 'jsonl', ...args]
      });
      const result = run.stdout
        .split('\n')
        .filter((line) => line.startsWith('{'))
        .map((line) => JSON.parse(line) as ResultRecord)
        .findLast((record) => record.type === 'result');
      return { ...run, result, tail: `${run.stdout}\n${run.stderr}`.slice(-3000) };
    };
    const stack = async () =>
      (await cloudFormation.send(new DescribeStacksCommand({ StackName: project.stackName }))).Stacks?.[0];
    const bucketsInStack = async () =>
      ((await describeStackResources(cloudFormation, project.stackName)) ?? [])
        .filter(({ ResourceType }) => ResourceType === 'AWS::S3::Bucket')
        .map(({ LogicalResourceId }) => LogicalResourceId)
        .sort();
    let deployed = false;
    try {
      await writeProjectFiles(project, {
        'hook.mjs': `import { appendFileSync } from 'node:fs';
appendFileSync(${JSON.stringify(runsPath)}, process.argv[2] + '\\n');
`,
        'stacktape.yml': config({ withData: true })
      });
      const created = await deploy('create', ['--autoConfirmOperation']);
      deployed = true;
      expect(created.exitCode, created.tail).toBe(0);
      const bucketsBefore = await bucketsInStack();
      expect(bucketsBefore.some((logicalId) => logicalId.startsWith('Data'))).toBe(true);
      const { LastUpdatedTime: updatedBefore, StackStatus: statusBefore } = (await stack())!;
      await rm(runsPath, { force: true });

      // The update deletes the `data` bucket. Standard input is closed, so the CLI cannot ask; without --yes it must
      // refuse before the hook runs and before it asks for the missing parameter, which it would otherwise create.
      await writeProjectFiles(project, {
        'stacktape.yml': config({ withData: false, referenceMissingParameter: true })
      });
      const refused = await deploy('refused', []);
      expect(refused.exitCode, refused.tail).not.toBe(0);
      expect(refused.result, refused.tail).toMatchObject({ ok: false, code: 'CONFIRMATION_REQUIRED' });
      expect(refused.result?.message).toContain('data');
      expect(await hookRuns()).toEqual([]);
      expect(await bucketsInStack()).toEqual(bucketsBefore);
      const after = (await stack())!;
      expect(after.StackStatus).toBe(statusBefore);
      expect(after.LastUpdatedTime).toEqual(updatedBefore);
      await expect(ssm.send(new GetParameterCommand({ Name: missingParameter }))).rejects.toThrow();

      // With --yes the same update runs the hook first, then deletes the bucket.
      await writeProjectFiles(project, { 'stacktape.yml': config({ withData: false }) });
      const confirmed = await deploy('confirmed', ['--autoConfirmOperation']);
      expect(confirmed.exitCode, confirmed.tail).toBe(0);
      expect(await hookRuns()).toEqual(['migrate']);
      expect((await bucketsInStack()).some((logicalId) => logicalId.startsWith('Data'))).toBe(false);
    } finally {
      try {
        if (deployed) {
          const deleted = await runSourceCli({ project, step: 'delete', ministack });
          expect(deleted.exitCode, deleted.tail).toBe(0);
          expect(await describeStackResources(cloudFormation, project.stackName)).toBeUndefined();
        }
      } finally {
        await project.close();
      }
    }
  } finally {
    cloudFormation.destroy();
    ssm.destroy();
    try {
      await ministack.stop();
    } finally {
      await rm(out, { recursive: true, force: true });
    }
  }
}, 420_000);
