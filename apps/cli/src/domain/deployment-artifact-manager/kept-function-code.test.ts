import { describe, expect, test } from 'bun:test';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { tagNames } from '@stacktape/naming/tag-names';
import { decideSkippedFunctionCode, type SkippedFunctionBuildReason } from './kept-function-code';

const DEPLOYED_KEY = 'worker/v000003-aaaa1111.zip';
const SESSION_DIGEST = 'bbbb2222';

const deployedFunction = (properties: Record<string, unknown> = {}) => ({
  Type: 'AWS::Lambda::Function',
  Properties: {
    Code: { S3Bucket: 'bucket', S3Key: DEPLOYED_KEY },
    Handler: 'worker.handler',
    Runtime: 'nodejs22.x',
    Architectures: ['arm64'],
    Tags: [
      { Key: tagNames.codeDigest(), Value: 'aaaa1111' },
      { Key: tagNames.artifactDigest(), Value: 'aaaa1111' }
    ],
    ...properties
  }
});

const decide = ({
  resource = deployedFunction() as unknown,
  deployed = true,
  stored = [DEPLOYED_KEY],
  liveTags = undefined as { key: string; value: string }[] | undefined,
  skipped = ['worker']
} = {}) =>
  decideSkippedFunctionCode({
    functions: [
      { name: 'api', cfLogicalName: cfLogicalNames.lambda('api') },
      { name: 'worker', cfLogicalName: cfLogicalNames.lambda('worker') }
    ],
    skippedFunctionNames: new Set(skipped),
    deployedTemplate: deployed ? { Resources: { [cfLogicalNames.lambda('worker')]: resource } } : undefined,
    deployedTags: () => liveTags,
    storedS3Keys: new Set(stored)
  });

describe('which functions a dev session leaves out keep their deployed code', () => {
  test('functions the session runs are not decided here: the dev stack builds them', () => {
    expect(decide({ skipped: [] })).toEqual([]);
  });

  test.each<[string, Parameters<typeof decide>[0], SkippedFunctionBuildReason]>([
    ['a new dev stack has no code for it', { deployed: false }, 'not-deployed'],
    ['a function added since the last update', { resource: null }, 'not-deployed'],
    [
      'code without a Stacktape artifact key',
      { resource: deployedFunction({ Code: { ZipFile: 'x' } }) },
      'not-deployed'
    ],
    ['the stored object was deleted', { stored: [] }, 'stored-code-missing'],
    [
      'it runs on shared layers older dev stacks built',
      {
        resource: deployedFunction({
          Layers: [{ 'Fn::GetAtt': [cfLogicalNames.sharedChunkLayer(1), 'LayerVersionArn'] }]
        })
      },
      'uses-shared-layers'
    ]
  ])('builds it when %s', (_case, input, reason) => {
    expect(decide(input)).toEqual([{ name: 'worker', build: reason }]);
  });

  test('keeps the deployed object, code settings and the tags of the code it runs', () => {
    const [decision] = decide({
      resource: deployedFunction({ Layers: ['arn:aws:lambda:eu-west-1:123456789012:layer:own:3'] }),
      // A previous session deployed other code directly and tagged it.
      liveTags: [
        { key: tagNames.codeDigest(), value: SESSION_DIGEST },
        { key: tagNames.artifactDigest(), value: SESSION_DIGEST }
      ]
    });
    expect(decision).toEqual({
      name: 'worker',
      keep: {
        s3Key: DEPLOYED_KEY,
        digest: 'aaaa1111',
        identityTags: [
          { name: tagNames.codeDigest(), value: SESSION_DIGEST },
          { name: tagNames.artifactDigest(), value: SESSION_DIGEST }
        ],
        properties: {
          Handler: 'worker.handler',
          Runtime: 'nodejs22.x',
          Architectures: ['arm64'],
          Layers: ['arn:aws:lambda:eu-west-1:123456789012:layer:own:3']
        }
      }
    });
  });

  test('without readable live tags, the deployed template tags say what it runs', () => {
    const [decision] = decide();
    expect(decision && 'keep' in decision && decision.keep.identityTags).toEqual([
      { name: tagNames.codeDigest(), value: 'aaaa1111' },
      { name: tagNames.artifactDigest(), value: 'aaaa1111' }
    ]);
  });
});
