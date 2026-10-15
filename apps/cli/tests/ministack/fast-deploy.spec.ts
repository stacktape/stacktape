import { expect, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CloudFormationClient, DescribeStacksCommand } from '@aws-sdk/client-cloudformation';
import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda';
import { ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3';
import { startMiniStack } from '@stacktape/ministack/fixture';
// oxlint-disable-next-line import/no-unassigned-import
import './offline-preload';
import {
  createFamilyProject,
  describeStackResources,
  getStackTemplate,
  runSourceCli,
  writeProjectFiles
} from './harness';

const config = {
  resources: {
    api: {
      type: 'function',
      properties: { packaging: { type: 'js-bundle', properties: { entryfilePath: 'handler.ts' } } }
    }
  }
};
const handler = (body: string) => `export default async () => ({ statusCode: 200, body: "${body}" });\n`;

// A code-only change is deployed without CloudFormation, recorded as a release, and restored by rollback.
test('code-only deploys update functions directly, record a release and roll back to the exact code', async () => {
  const out = await mkdtemp(join(tmpdir(), 'stp-fast-deploy-'));
  const ministack = await startMiniStack({ label: 'fast-deploy' });
  const cloudFormation = new CloudFormationClient(ministack.clientConfig());
  const lambda = new LambdaClient(ministack.clientConfig());
  const s3 = new S3Client(ministack.clientConfig());
  const project = await createFamilyProject({ familyName: 'fast-deploy', out, ministack });
  let deployed = false;
  const deployedVersion = async () =>
    (await cloudFormation.send(new DescribeStacksCommand({ StackName: project.stackName }))).Stacks![0]!.Outputs!.find(
      ({ OutputKey }) => OutputKey === 'StpDeploymentVersion'
    )!.OutputValue;
  const invoke = async (functionName: string) => {
    const result = await lambda.send(new InvokeCommand({ FunctionName: functionName, Payload: Buffer.from('{}') }));
    return (JSON.parse(Buffer.from(result.Payload!).toString()) as { body: string }).body;
  };
  try {
    await writeProjectFiles(project, { 'stacktape.yml': config, 'handler.ts': handler('first') });
    const created = await runSourceCli({ project, step: 'create', ministack });
    expect(created.exitCode, created.tail).toBe(0);
    deployed = true;
    const resources = (await describeStackResources(cloudFormation, project.stackName))!;
    const functionName = resources.find(
      ({ LogicalResourceId }) => LogicalResourceId === 'ApiFunction'
    )!.PhysicalResourceId!;
    const bucket = resources.find(
      ({ LogicalResourceId }) => LogicalResourceId === 'StpDeploymentBucket'
    )!.PhysicalResourceId!;
    const templateAfterCreate = await getStackTemplate(cloudFormation, project.stackName);
    expect(await invoke(functionName)).toBe('first');

    await writeProjectFiles(project, { 'handler.ts': handler('second') });
    const fast = await runSourceCli({ project, step: 'update', ministack });
    expect(fast.exitCode, fast.tail).toBe(0);
    // No change plan and an untouched stack: the code went in directly.
    expect(fast.changeSummary).toBeUndefined();
    expect(await getStackTemplate(cloudFormation, project.stackName)).toBe(templateAfterCreate);
    expect(await deployedVersion()).toBe('v000001');
    expect(await invoke(functionName)).toBe('second');
    const releaseTemplates = async () =>
      ((await s3.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: 'cf-template/' }))).Contents ?? [])
        .map(({ Key }) => Key)
        .toSorted();
    expect(await releaseTemplates()).toEqual(['cf-template/v000001.yml', 'cf-template/v000002.yml']);

    // Deploying the same code again changes nothing and records no release.
    const unchanged = await runSourceCli({ project, step: 'unchanged', ministack });
    expect(unchanged.exitCode, unchanged.tail).toBe(0);
    expect(unchanged.changeSummary).toBeUndefined();
    expect(await releaseTemplates()).toEqual(['cf-template/v000001.yml', 'cf-template/v000002.yml']);

    // Rolling back from the fast release v000002 restores v000001's code as v000003, through CloudFormation, even
    // though the template CloudFormation holds already references v000001's code.
    const rolledBack = await runSourceCli({
      project,
      step: 'rollback',
      ministack,
      rollbackTarget: ['--rollbackSteps', '1']
    });
    expect(rolledBack.exitCode, rolledBack.tail).toBe(0);
    expect(await deployedVersion()).toBe('v000003');
    expect(await invoke(functionName)).toBe('first');

    // Rolling forward to the fast release restores its code as well.
    const forward = await runSourceCli({
      project,
      step: 'rollback',
      ministack,
      rollbackTarget: ['--targetVersion', 'v000002']
    });
    expect(forward.exitCode, forward.tail).toBe(0);
    expect(await deployedVersion()).toBe('v000004');
    expect(await invoke(functionName)).toBe('second');
  } finally {
    try {
      if (deployed) {
        const deleted = await runSourceCli({ project, step: 'delete', ministack });
        expect(deleted.exitCode, deleted.tail).toBe(0);
      }
    } finally {
      await project.close();
      await ministack.stop();
      await rm(out, { recursive: true, force: true });
    }
  }
});
