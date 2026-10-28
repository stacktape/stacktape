import { spawn, type SpawnOptions } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, test } from 'bun:test';
import {
  CloudFormationClient,
  CreateStackCommand,
  DeleteStackCommand,
  DescribeStacksCommand,
  waitUntilStackCreateComplete,
  waitUntilStackDeleteComplete
} from '@aws-sdk/client-cloudformation';
import { startMiniStack } from '@stacktape/ministack/fixture';
import { outputNames } from '@stacktape/naming/stack-output-names';
import { inspectDeployTarget, startDeploy } from '../../src/init/deploy/run-deploy';
import { INIT_TARGET_CHECK_ENV, INIT_TARGET_EXPECTATION_ENV } from '../../src/init/deploy/stack-expectation';
import { buildOfflineQualificationEnvironment } from '../qualification/offline-aws';
import { createInitSandbox } from './harness';
import { startControlPlaneFake } from '../../tests/cli-process/control-plane-fake';

const cliDirectory = join(import.meta.dir, '..', '..');

describe('the deploy target init reviewed', () => {
  test('a stack appearing after create consent and changed config bytes stop the real deploy before it writes AWS state', async () => {
    const sandbox = await createInitSandbox({
      files: () => ({ 'stacktape.yml': 'resources:\n  data:\n    type: bucket\n' })
    });
    const aws = await startMiniStack({ label: `init-consent-${sandbox.id}` }).catch(async (error) => {
      await sandbox.cleanup();
      throw error;
    });
    const cloudformation = new CloudFormationClient(aws.clientConfig());
    const projectName = `consent${sandbox.id}`;
    const stackName = `${projectName}-dev`;
    const api = await startControlPlaneFake({ projectName, awsAccountId: aws.defaultAccount.accountId }).catch(
      async (error) => {
        cloudformation.destroy();
        try {
          await aws.stop();
        } finally {
          await sandbox.cleanup();
        }
        throw error;
      }
    );
    const request = {
      repositoryRoot: sandbox.project,
      configPath: 'stacktape.yml',
      projectName,
      stage: 'dev',
      region: aws.region
    };
    const offline = buildOfflineQualificationEnvironment({
      endpoint: aws.endpoint,
      invocationId: `consent-${sandbox.id}`,
      homeDirectory: sandbox.home
    });
    // Substitute only the executable resolution and environment. The actual child runs today's source CLI,
    // and the two consent variables must come from run-deploy, exactly as they do in an init session.
    let childOutput = '';
    const spawnChild = ((_command: string, args: string[], options: SpawnOptions) => {
      const child = spawn(
        process.execPath,
        [
          '--no-env-file',
          '--preload',
          join(cliDirectory, 'scripts', 'network-guard-preload.ts'),
          join(cliDirectory, 'scripts', 'dev.ts'),
          ...args.slice(args.indexOf('deploy'))
        ],
        {
          ...options,
          cwd: cliDirectory,
          env: {
            ...offline,
            ...aws.childEnvironment(),
            STP_CUSTOM_TRPC_API_ENDPOINT: api.endpoint,
            [INIT_TARGET_CHECK_ENV]: options.env?.[INIT_TARGET_CHECK_ENV],
            [INIT_TARGET_EXPECTATION_ENV]: options.env?.[INIT_TARGET_EXPECTATION_ENV]
          }
        }
      );
      child.stdout?.on('data', (chunk: Buffer) => {
        childOutput = `${childOutput}${chunk.toString()}`.slice(-4_000);
      });
      child.stderr?.on('data', (chunk: Buffer) => {
        childOutput = `${childOutput}${chunk.toString()}`.slice(-4_000);
      });
      return child;
    }) as typeof spawn;
    let stackId: string | undefined;
    try {
      const absent = await inspectDeployTarget({ request, spawnChild });
      expect(absent, childOutput).toMatchObject({
        status: 'absent',
        accountId: aws.defaultAccount.accountId,
        stackName
      });
      if (!absent) throw new Error('No typed target observation');
      // The stack that appears is one another deploy completed: every completed deploy records its version output.
      // A stack without it holds only a failed first deploy's artifact resources and is still checked as absent.
      const created = await cloudformation.send(
        new CreateStackCommand({
          StackName: stackName,
          TemplateBody: JSON.stringify({
            Description: `STP-stack_${projectName}_dev_hash`,
            Resources: { Data: { Type: 'AWS::S3::Bucket' } },
            Outputs: { [outputNames.deploymentVersion()]: { Value: 'v000001' } }
          }),
          Tags: [
            { Key: 'stp:project-name', Value: projectName },
            { Key: 'stp:stage', Value: 'dev' }
          ]
        })
      );
      stackId = created.StackId;
      await waitUntilStackCreateComplete(
        { client: cloudformation, maxWaitTime: 30, minDelay: 1, maxDelay: 1 },
        { StackName: stackName }
      );
      const observed = await inspectDeployTarget({ request, spawnChild });
      expect(observed).toMatchObject({ status: 'updateable', stackId });

      const deploy = async (
        targetExpectation: NonNullable<Parameters<typeof startDeploy>[0]['request']['targetExpectation']>
      ) => {
        const events: unknown[] = [];
        const handle = startDeploy({
          request: { ...request, targetExpectation },
          spawnChild,
          onEvent: (event) => events.push(event),
          onLine: () => {}
        });
        const deadline = setTimeout(() => handle.cancel(), 30_000);
        try {
          expect(await handle.finished).not.toBe(0);
          expect(events).toContainEqual(
            expect.objectContaining({ type: 'result', ok: false, code: 'INIT_STACK_EXPECTATION_MISMATCH' })
          );
        } finally {
          clearTimeout(deadline);
          handle.cancel();
        }
      };
      await deploy({ ...absent, expected: 'create' });
      if (observed?.status !== 'updateable') throw new Error('No updateable target');
      const bytes = await readFile(join(sandbox.project, 'stacktape.yml'), 'utf8');
      await writeFile(join(sandbox.project, 'stacktape.yml'), `${bytes}# changed after review\n`);
      await deploy({ ...observed, expected: 'update' });
      const kept = (await cloudformation.send(new DescribeStacksCommand({ StackName: stackName }))).Stacks?.[0];
      expect(kept?.StackId).toBe(stackId);
      expect(kept?.StackStatus).toBe('CREATE_COMPLETE');
      expect(api.unexpectedProcedures).toEqual([]);
    } finally {
      try {
        if (stackId) {
          await cloudformation.send(new DeleteStackCommand({ StackName: stackId }));
          await waitUntilStackDeleteComplete(
            { client: cloudformation, maxWaitTime: 30, minDelay: 1, maxDelay: 1 },
            { StackName: stackId }
          );
        }
      } finally {
        cloudformation.destroy();
        try {
          try {
            await api.close();
          } finally {
            await aws.stop();
          }
        } finally {
          await sandbox.cleanup();
        }
      }
    }
  }, 120_000);
});
