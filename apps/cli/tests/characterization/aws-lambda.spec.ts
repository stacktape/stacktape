import { describe, expect, test } from 'bun:test';
import type { LambdaClient } from '@aws-sdk/client-lambda';
import {
  InvokeCommand,
  PublishVersionCommand,
  TagResourceCommand,
  UpdateAliasCommand,
  UpdateFunctionCodeCommand
} from '@aws-sdk/client-lambda';
import { toUtf8 } from '@smithy/util-utf8';
import { AwsLambda } from '../../src/aws/lambda';

type Send = LambdaClient['send'];

const lambdaWith = (send: Send) =>
  new AwsLambda({
    createClient: () => ({ send }) as LambdaClient,
    getErrorHandler: (message) => (error) => {
      throw new Error(message, { cause: error });
    }
  });

describe('AWS Lambda operations', () => {
  test('serializes invocation payloads and selects the requested invocation mode', async () => {
    const requests: InvokeCommand[] = [];
    const lambda = lambdaWith((async (command: InvokeCommand) => {
      requests.push(command);
      return {
        $metadata: {},
        Payload: new TextEncoder().encode(JSON.stringify({ accepted: true })),
        StatusCode: 200
      };
    }) as Send);

    const synchronousResult = await lambda.invoke({
      lambdaResourceName: 'deployment-script',
      payload: { action: 'deploy', attempt: 1 }
    });
    await lambda.invoke({
      asynchronous: true,
      lambdaResourceName: 'custom-resource-handler',
      payload: { attempt: 2 }
    });

    expect(synchronousResult).toMatchObject({ Payload: '{"accepted":true}', StatusCode: 200 });
    expect(
      requests.map(({ input }) => ({
        functionName: input.FunctionName,
        invocationType: input.InvocationType,
        payload: toUtf8(input.Payload as Uint8Array)
      }))
    ).toEqual([
      {
        functionName: 'deployment-script',
        invocationType: 'RequestResponse',
        payload: '{"action":"deploy","attempt":1}'
      },
      {
        functionName: 'custom-resource-handler',
        invocationType: 'Event',
        payload: '{"attempt":2}'
      }
    ]);
  });

  test('keeps function deployment mutations mapped to their AWS inputs', async () => {
    const requests: (PublishVersionCommand | TagResourceCommand | UpdateAliasCommand | UpdateFunctionCodeCommand)[] =
      [];
    const lambda = lambdaWith((async (command: (typeof requests)[number]) => {
      requests.push(command);
      return command instanceof PublishVersionCommand ? { Version: '7' } : {};
    }) as Send);

    await lambda.updateFunctionCode({
      artifactBucketName: 'artifacts',
      artifactS3Key: 'functions/example.zip',
      lambdaResourceName: 'example'
    });
    await lambda.tagFunction({
      lambdaArn: 'arn:aws:lambda:eu-west-1:123456789012:function:example',
      tags: [
        { key: 'stackName', value: 'example-stack' },
        { key: 'stage', value: 'production' }
      ]
    });
    await lambda.publishVersion({ lambdaResourceName: 'example' });
    await lambda.updateAlias({ aliasName: 'live', lambdaResourceName: 'example', version: '7' });

    expect(requests.map(({ input }) => input)).toEqual([
      { FunctionName: 'example', S3Bucket: 'artifacts', S3Key: 'functions/example.zip' },
      {
        Resource: 'arn:aws:lambda:eu-west-1:123456789012:function:example',
        Tags: { stackName: 'example-stack', stage: 'production' }
      },
      { FunctionName: 'example' },
      { FunctionName: 'example', FunctionVersion: '7', Name: 'live' }
    ]);
  });
});
