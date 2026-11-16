import { afterAll, beforeAll, expect, test } from 'bun:test';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { CloudFormationClient, DescribeStacksCommand } from '@aws-sdk/client-cloudformation';
import { CreateRepositoryCommand, ECRClient } from '@aws-sdk/client-ecr';
import { CreateBucketCommand, S3Client } from '@aws-sdk/client-s3';
import { awsResourceNames } from '@stacktape/naming/aws-resource-names';
import { getGloballyUniqueStackHash } from '@stacktape/naming/stack-identity';
import { buildOperationsCli, createOperationsFixture, seedDeployedStack, targetArgs } from './cli-process';
import { parseCliJsonl } from '../verify-source-cli-aws-readonly';

let cli: Awaited<ReturnType<typeof buildOperationsCli>>;
beforeAll(async () => {
  cli = await buildOperationsCli();
}, 60_000);
afterAll(async () => {
  await cli?.close();
});

test('a failing before:delete hook stops the delete and leaves the stack in place', async () => {
  const fixture = await createOperationsFixture(cli.path);
  const cloudformation = new CloudFormationClient(fixture.clientConfig());
  try {
    await seedDeployedStack(fixture);
    await writeFile(
      join(fixture.directory, 'stacktape.yml'),
      JSON.stringify({
        resources: {},
        scripts: { guard: { type: 'local-script', properties: { executeCommand: 'echo j9-guard-refused; exit 4' } } },
        hooks: { beforeDelete: [{ scriptName: 'guard' }] }
      })
    );
    const result = await fixture.run(['delete', ...targetArgs, '--autoConfirmOperation', '--agent']);
    const { result: final } = parseCliJsonl(result.stdout, 'delete');
    expect(result.exitCode, final.message).toBe(1);
    expect(final.code).toBe('SCRIPT_ERROR');
    expect(final.message).toContain('beforeDelete hook');
    expect(fixture.aws.callsTo('cloudformation.DeleteStack')).toEqual([]);
    const { Stacks } = await cloudformation.send(new DescribeStacksCommand({ StackName: 'j9-operations-test' }));
    expect(Stacks?.[0]?.StackStatus).not.toContain('DELETE');
    expect(fixture.aws.unexpected).toEqual([]);
    expect(fixture.api.unexpected).toEqual([]);
  } finally {
    cloudformation.destroy();
    await fixture.close();
  }
}, 60_000);

/** What a deploy reads before its hooks run: the Console's answers and the deployed stack's bucket and repository. */
const prepareDeploy = async (fixture: Awaited<ReturnType<typeof createOperationsFixture>>) => {
  fixture.api.on('canDeploy', () => ({ canDeploy: true }));
  fixture.api.on('defaultDomainsInfo', () => ({
    suffix: '-00000000.stacktape-app.com',
    certDomainSuffix: '.stacktape-app.com',
    version: 1
  }));
  fixture.api.on('syncUptimeChecks', () => ({ missingChannelNames: [] }));
  fixture.api.on('recordSecurityReport', () => ({ accepted: true }));
  const stackHash = getGloballyUniqueStackHash({
    region: 'eu-west-1',
    stackName: 'j9-operations-test',
    accountId: fixture.accountId!
  });
  const ecr = new ECRClient(fixture.clientConfig());
  const s3 = new S3Client(fixture.clientConfig());
  try {
    await ecr.send(new CreateRepositoryCommand({ repositoryName: awsResourceNames.deploymentEcrRepo(stackHash) }));
    await s3.send(new CreateBucketCommand({ Bucket: awsResourceNames.deploymentBucket(stackHash) }));
  } finally {
    ecr.destroy();
    s3.destroy();
  }
};

/** Whether a process still runs. On Linux an orphan can briefly be a zombie its new parent has not reaped yet. */
const stillRuns = async (pid: number) => {
  try {
    if (process.platform === 'linux') {
      return !(await readFile(`/proc/${pid}/stat`, 'utf8')).split(') ')[1]?.startsWith('Z ');
    }
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

// Windows has no SIGINT to send: `kill('SIGINT')` terminates the CLI instead of interrupting it.
test.skipIf(process.platform === 'win32').each([
  ['SIGINT', 130],
  ['SIGTERM', 143]
] as const)(
  'a deploy interrupted by %s exits %d, reports USER_INTERRUPTION and stops the hook it was running',
  async (signal, exitCode) => {
    const fixture = await createOperationsFixture(cli.path);
    try {
      await seedDeployedStack(fixture);
      await prepareDeploy(fixture);
      await writeFile(
        join(fixture.directory, 'hook.ts'),
        `import { writeFileSync } from 'node:fs';
writeFileSync('hook.pid', String(process.pid));
setInterval(() => {}, 1000);
`
      );
      await writeFile(
        join(fixture.directory, 'stacktape.yml'),
        JSON.stringify({
          resources: {},
          scripts: { migrate: { type: 'local-script', properties: { executeScript: 'hook.ts' } } },
          hooks: { beforeDeploy: [{ scriptName: 'migrate' }] }
        })
      );
      const deploy = fixture.start(['deploy', ...targetArgs, '--autoConfirmOperation', '--agent'], {
        timeoutMs: 60_000
      });
      let hookPid = 0;
      for (const deadline = Date.now() + 40_000; !hookPid; await Bun.sleep(50)) {
        hookPid = Number(await readFile(join(fixture.directory, 'hook.pid'), 'utf8').catch(() => 0));
        if (deploy.child.exitCode !== null || Date.now() > deadline) {
          throw new Error(`The beforeDeploy hook never started:\n${deploy.output().slice(-3000)}`);
        }
      }
      deploy.child.kill(signal);
      const result = await deploy.finished;
      // `deploy && next-step` must not continue after an interrupted deploy.
      expect(result.exitCode, result.stdout.slice(-2000)).toBe(exitCode);
      expect(parseCliJsonl(result.stdout, 'deploy').result).toMatchObject({ ok: false, code: 'USER_INTERRUPTION' });
      expect(await stillRuns(hookPid)).toBe(false);
      expect(fixture.aws.callsTo('cloudformation.UpdateStack')).toEqual([]);
      expect(fixture.aws.callsTo('cloudformation.CreateChangeSet')).toEqual([]);
      expect(fixture.aws.unexpected).toEqual([]);
    } finally {
      await fixture.close();
    }
  },
  90_000
);

test('--agent and machine output do not confirm a delete or a project creation, and keep an explicit --yes=false', async () => {
  const fixture = await createOperationsFixture(cli.path);
  try {
    await seedDeployedStack(fixture);
    await prepareDeploy(fixture);
    await writeFile(join(fixture.directory, 'stacktape.yml'), JSON.stringify({ resources: {} }));
    for (const args of [
      ['delete', ...targetArgs, '--agent'],
      ['delete', ...targetArgs, '--agent', '--yes=false'],
      ['delete', ...targetArgs, '--output-format', 'jsonl']
    ]) {
      const result = await fixture.run(args);
      const { result: final } = parseCliJsonl(result.stdout, 'delete');
      expect(result.exitCode, final.message).toBe(1);
      expect(final.code).toBe('CONFIRMATION_REQUIRED');
      expect(JSON.stringify(final)).toContain('--yes');
    }
    expect(fixture.aws.callsTo('cloudformation.DeleteStack')).toEqual([]);

    // A project named only on the command line may be a typo: agent mode does not create it without --yes.
    const created = await fixture.run([
      'deploy',
      '--projectName',
      'j9-not-created',
      '--stage',
      'test',
      '--region',
      'eu-west-1',
      '--agent'
    ]);
    const { result: refused } = parseCliJsonl(created.stdout, 'deploy');
    expect(created.exitCode, refused.message).toBe(1);
    expect(refused.code).toBe('CONFIRMATION_REQUIRED');
    expect(refused.message).toContain('j9-not-created');
    expect(fixture.api.calls.map(({ procedure }) => procedure)).not.toContain('createProject');
    expect(fixture.aws.unexpected).toEqual([]);
  } finally {
    await fixture.close();
  }
}, 90_000);
