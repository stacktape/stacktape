import { expect, test } from 'bun:test';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CloudFormationClient, DescribeStacksCommand } from '@aws-sdk/client-cloudformation';
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
      expect(reportedEvents(project)).not.toContain('DEPLOY_FAILED');
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
