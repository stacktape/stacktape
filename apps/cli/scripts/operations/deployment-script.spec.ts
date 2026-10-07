import { afterAll, beforeAll, expect, test } from 'bun:test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import AdmZip from 'adm-zip';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { awsResourceNames } from '@stacktape/naming/aws-resource-names';
import { buildOperationsCli, createOperationsFixture, seedDeployedStack, targetArgs } from './cli-process';
import { parseCliJsonl } from '../verify-source-cli-aws-readonly';
import { toQueryXml } from './loopback-aws';

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
    seedDeployedStack(fixture, {
      task: {
        resourceType: 'deployment-script',
        links: {},
        outputs: {},
        referencableParams: {},
        cloudformationChildResources: {}
      }
    });
    const functionName = awsResourceNames.lambda('taskScriptFunction', 'j9-operations-test');
    const arn = `arn:aws:lambda:eu-west-1:111122223333:function:${functionName}`;
    fixture.aws.on('cloudformation.ListStackResources', () => ({
      kind: 'xml',
      operation: 'ListStackResources',
      result: toQueryXml({
        StackResourceSummaries: [
          {
            LogicalResourceId: cfLogicalNames.lambda('taskScriptFunction'),
            PhysicalResourceId: functionName,
            ResourceType: 'AWS::Lambda::Function',
            ResourceStatus: 'CREATE_COMPLETE'
          }
        ]
      })
    }));
    fixture.aws.on(`lambda.GET /2017-03-31/tags/${encodeURIComponent(arn)}`, () => ({
      kind: 'json',
      body: { Tags: {} }
    }));
    fixture.aws.on('ecr.ListImages', () => ({ kind: 'json', body: { imageIds: [] } }));
    let uploadedKey: string;
    let uploadedBucket: string;
    fixture.aws.on('s3.*', ({ method, path, rawBytes }) => {
      if (method === 'GET')
        return {
          kind: 'raw',
          status: 200,
          contentType: 'application/xml',
          body: '<ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><IsTruncated>false</IsTruncated></ListBucketResult>'
        };
      if (method === 'PUT') {
        const segments = decodeURIComponent(path).slice(1).split('/');
        uploadedBucket = segments.shift();
        uploadedKey = segments.join('/');
        archive = rawBytes;
        return { kind: 'raw', status: 200, contentType: 'application/xml', body: '' };
      }
      throw new Error(`Unexpected S3 operation ${method}`);
    });
    let archive: Buffer;
    let invocation = 0;
    const sequence: string[] = [];
    fixture.aws.on('lambda.*', async ({ method, path, input }) => {
      if (method === 'GET' && path.includes('/tags/')) return { kind: 'json', body: { Tags: {} } };
      if (method === 'PUT' && path.endsWith('/code')) {
        expect(decodeURIComponent(path)).toContain(functionName);
        expect(input).toMatchObject({ S3Bucket: uploadedBucket, S3Key: uploadedKey });
        sequence.push('update');
        return { kind: 'json', body: { FunctionArn: arn } };
      }
      if (method === 'GET' && path.endsWith('/configuration'))
        return { kind: 'json', body: { FunctionArn: arn, State: 'Active', LastUpdateStatus: 'Successful' } };
      if (method === 'POST' && path.includes('/tags/')) {
        sequence.push('tag');
        return { kind: 'json', body: {} };
      }
      if (method === 'POST' && path.endsWith('/invocations')) {
        expect(decodeURIComponent(path)).toContain(arn);
        expect(input).toEqual({ value: invocation ? 'fail' : 'j9-parameter' });
        expect(archive).toBeDefined();
        const zip = new AdmZip(archive);
        const code = zip.readAsText('index.js');
        expect(code).toContain('j9-deployment-script');
        const executionPath = join(fixture.directory, 'execute.cjs');
        await writeFile(
          executionPath,
          `${code}\nexports.handler(${JSON.stringify(input)}).then(result => process.stdout.write(JSON.stringify(result))).catch(error => { process.stdout.write(JSON.stringify({ errorMessage: error.message })); process.exitCode = 1; });`
        );
        const child = Bun.spawn([process.execPath, executionPath], {
          cwd: fixture.directory,
          env: { PATH: process.env.PATH },
          stdout: 'pipe',
          stderr: 'pipe'
        });
        const output = new Response(child.stdout).text();
        const errors = new Response(child.stderr).text();
        expect(await child.exited, await errors).toBe(invocation ? 1 : 0);
        invocation++;
        sequence.push('invoke');
        return {
          kind: 'raw',
          status: 200,
          contentType: 'application/json',
          body: await output,
          ...(invocation === 2 ? { headers: { 'x-amz-function-error': 'Unhandled' } } : {})
        };
      }
      throw new Error(`Unexpected Lambda operation ${method} ${path}`);
    });
    const run = await fixture.run(['deployment-script:run', '--resourceName', 'task', ...targetArgs, '--agent']);
    const { result } = parseCliJsonl(run.stdout, 'deployment-script:run');
    expect(run.exitCode, result.message).toBe(0);
    expect(result.data.result).toMatchObject({
      success: true,
      returnedPayload: '{"received":"j9-parameter","from":"j9-deployment-script"}'
    });
    expect(invocation).toBe(1);
    expect(sequence).toEqual(['update', 'tag', 'tag', 'invoke']);
    expect(fixture.aws.unexpected).toEqual([]);
    expect(fixture.api.unexpected).toEqual([]);
    expect(run.stderr).toBe('');
    config.resources.task.properties.parameters.value = 'fail';
    await writeFile(configPath, JSON.stringify(config));
    const failed = await fixture.run(['deployment-script:run', '--resourceName', 'task', ...targetArgs, '--agent']);
    expect(failed.exitCode).toBe(1);
    expect(parseCliJsonl(failed.stdout, 'deployment-script:run').result.code).toBe('DEPLOYMENT_SCRIPT_FAILED');
    expect(failed.stdout).toContain('j9-function-rejected');
    expect(invocation).toBe(2);
    expect(fixture.aws.unexpected).toEqual([]);
    expect(fixture.api.unexpected).toEqual([]);
  } finally {
    await fixture.close();
  }
}, 60_000);
