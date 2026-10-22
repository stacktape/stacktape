import { afterAll, beforeAll, expect, test } from 'bun:test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import AdmZip from 'adm-zip';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { awsResourceNames } from '@stacktape/naming/aws-resource-names';
import { writeHelperLambdaManifest } from '@utils/helper-lambdas';
import { buildOperationsCli, createOperationsFixture, seedDeployedStack, targetArgs } from './cli-process';
import { parseCliJsonl } from '../verify-source-cli-aws-readonly';
import { getGloballyUniqueStackHash } from '@stacktape/naming/stack-identity';
import { ECRClient, CreateRepositoryCommand } from '@aws-sdk/client-ecr';
import { LambdaClient, GetFunctionCommand } from '@aws-sdk/client-lambda';
import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';

let cli: Awaited<ReturnType<typeof buildOperationsCli>>;
beforeAll(async () => {
  cli = await buildOperationsCli();
}, 60_000);
afterAll(async () => {
  await cli?.close();
});

test('deployment script uploads its nested function, invokes the built artifact with parameters, and propagates function failure', async () => {
  const fixture = await createOperationsFixture(cli.path);
  try {
    // Only this helper's installed artifact metadata is needed for synthesis; the command never invokes it.
    const inventory = new AdmZip();
    inventory.addFile('index.js', Buffer.from('exports.default = async () => {};'));
    inventory.writeZip(
      join(fixture.directory, '__stacktape-dist/dev/helper-lambdas/stacktapeServiceLambda-fixture.zip')
    );
    await writeHelperLambdaManifest({
      helperLambdasDir: join(fixture.directory, '__stacktape-dist/dev/helper-lambdas'),
      artifacts: { stacktapeServiceLambda: 'stacktapeServiceLambda-fixture.zip' }
    });
    await mkdir(join(fixture.directory, 'artifact'));
    await writeFile(
      join(fixture.directory, 'artifact/index.js'),
      "exports.handler = async ({ value }) => { if (value === 'fail') throw new Error('j9-function-rejected'); return { received: value, from: 'j9-deployment-script' }; };"
    );
    const config = {
      deploymentConfig: { disableS3TransferAcceleration: true },
      resources: {
        task: {
          type: 'deployment-script',
          properties: {
            trigger: 'after:deploy',
            runtime: 'nodejs22.x',
            packaging: {
              type: 'custom-artifact',
              properties: { packagePath: './artifact', handler: 'index.js:handler' }
            },
            parameters: { value: 'j9-parameter' }
          }
        }
      }
    };
    const configPath = join(fixture.directory, 'stacktape.yml');
    await writeFile(configPath, JSON.stringify(config));
    const functionName = awsResourceNames.lambda('taskScriptFunction', 'j9-operations-test');
    const accountId = fixture.clientConfig().credentials.accessKeyId;
    const hash = getGloballyUniqueStackHash({ accountId, region: 'eu-west-1', stackName: 'j9-operations-test' });
    const bucket = awsResourceNames.deploymentBucket(hash);
    const ecr = new ECRClient(fixture.clientConfig());
    try {
      await ecr.send(new CreateRepositoryCommand({ repositoryName: awsResourceNames.deploymentEcrRepo(hash) }));
    } finally {
      ecr.destroy();
    }
    await seedDeployedStack(
      fixture,
      {
        task: {
          resourceType: 'deployment-script',
          links: {},
          outputs: {},
          referencableParams: {},
          cloudformationChildResources: {}
        }
      },
      {
        DeploymentBucket: { Type: 'AWS::S3::Bucket', Properties: { BucketName: bucket } },
        [cfLogicalNames.lambda('taskScriptFunction')]: {
          Type: 'AWS::Lambda::Function',
          Properties: {
            FunctionName: functionName,
            Runtime: 'nodejs22.x',
            Handler: 'index.handler',
            Role: `arn:aws:iam::${accountId}:role/fixture`,
            Code: { ZipFile: "exports.handler = async () => ({ from: 'stale-artifact' });" }
          }
        }
      }
    );
    const s3 = new S3Client(fixture.clientConfig());
    const lambda = new LambdaClient(fixture.clientConfig());
    try {
      const run = await fixture.run(['deployment-script:run', '--resourceName', 'task', ...targetArgs, '--agent']);
      const { result } = parseCliJsonl(run.stdout, 'deployment-script:run');
      expect(run.exitCode, result.message).toBe(0);
      const returned = result.data.result as { success: boolean; returnedPayload: string };
      expect(returned.success).toBe(true);
      expect(JSON.parse(returned.returnedPayload)).toEqual({ received: 'j9-parameter', from: 'j9-deployment-script' });
      const objects = await s3.send(new ListObjectsV2Command({ Bucket: bucket }));
      expect(objects.Contents).toHaveLength(1);
      const uploaded = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: objects.Contents![0].Key }));
      expect(new AdmZip(Buffer.from(await uploaded.Body!.transformToByteArray())).readAsText('index.js')).toContain(
        'j9-deployment-script'
      );
      const deployed = await lambda.send(new GetFunctionCommand({ FunctionName: functionName }));
      expect(deployed.Configuration!.Handler).toBe('index.handler');
      expect(fixture.aws.unexpected).toEqual([]);
      expect(fixture.api.unexpected).toEqual([]);
      expect(run.stderr).toBe('');
      config.resources.task.properties.parameters.value = 'fail';
      await writeFile(configPath, JSON.stringify(config));
      const failed = await fixture.run(['deployment-script:run', '--resourceName', 'task', ...targetArgs, '--agent']);
      expect(failed.exitCode).toBe(1);
      expect(parseCliJsonl(failed.stdout, 'deployment-script:run').result.code).toBe('DEPLOYMENT_SCRIPT_FAILED');
      expect(failed.stdout).toContain('j9-function-rejected');

      expect(fixture.aws.unexpected).toEqual([]);
      expect(fixture.api.unexpected).toEqual([]);
    } finally {
      s3.destroy();
      lambda.destroy();
    }
  } finally {
    await fixture.close();
  }
}, 60_000);
