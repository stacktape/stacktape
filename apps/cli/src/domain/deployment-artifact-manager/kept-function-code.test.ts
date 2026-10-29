import { describe, expect, test } from 'bun:test';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { tagNames } from '@stacktape/naming/tag-names';
import {
  decideSkippedFunctionCode,
  findKeptFunctionsWithChangedConfiguration,
  type SkippedFunctionBuildReason
} from './kept-function-code';

const WORKER = cfLogicalNames.lambda('worker');
const ROLE = cfLogicalNames.lambdaRole('worker');
const TEMPLATE_KEY = 'worker/v000003-aaaa1111.zip';
/** What a session deployed directly, after uploading it. */
const SESSION_KEY = 'worker/v000004-bbbb2222.zip';

const identityTags = (digest: string) => [
  { Key: tagNames.codeDigest(), Value: digest },
  { Key: tagNames.artifactDigest(), Value: digest }
];
const liveTags = (digest: string) => [
  { key: tagNames.codeDigest(), value: digest },
  { key: tagNames.artifactDigest(), value: digest }
];

const deployedFunction = (properties: Record<string, unknown> = {}) => ({
  Type: 'AWS::Lambda::Function',
  Properties: {
    Code: { S3Bucket: 'bucket', S3Key: TEMPLATE_KEY },
    Handler: 'worker.handler',
    Runtime: 'nodejs22.x',
    Role: { 'Fn::GetAtt': [ROLE, 'Arn'] },
    Environment: { Variables: { OLD_TOKEN: 'abc', QUEUE_URL: { Ref: 'JobsQueue' }, REGION: { Ref: 'AWS::Region' } } },
    Tags: identityTags('aaaa1111'),
    ...properties
  }
});

const stored = (...keys: string[]) =>
  keys.map((s3Key) => {
    const [name, rest] = s3Key.split('/');
    const [version, file] = rest!.split('-');
    return { s3Key, name: name!, version: version!, digest: file!.replace('.zip', '') };
  });

const decide = ({
  resource = deployedFunction() as unknown,
  deployed = true,
  objects = stored(TEMPLATE_KEY),
  tags = undefined as { key: string; value: string }[] | undefined,
  skipped = ['worker']
} = {}) =>
  decideSkippedFunctionCode({
    functions: [
      { name: 'api', cfLogicalName: cfLogicalNames.lambda('api') },
      { name: 'worker', cfLogicalName: WORKER }
    ],
    skippedFunctionNames: new Set(skipped),
    deployedTemplate: deployed ? { Resources: { [WORKER]: resource } } : undefined,
    deployedTags: () => tags,
    storedObjects: objects
  });

describe('which functions a dev session leaves out keep the code they run', () => {
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
    ['the stored object was deleted', { objects: [] }, 'stored-code-missing'],
    // Review of #395: a session deployed B directly and B's object is gone; keeping A while the tags say B lied.
    [
      'the code a session deployed directly has no stored object',
      { tags: liveTags('bbbb2222') },
      'stored-code-missing'
    ],
    ['an earlier update of its code did not finish', { tags: liveTags('updating') }, 'code-unknown'],
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

  test('keeps the template object when the function runs it', () => {
    expect(decide({ tags: liveTags('aaaa1111') })).toEqual([
      {
        name: 'worker',
        keep: {
          s3Key: TEMPLATE_KEY,
          digest: 'aaaa1111',
          identityTags: [
            { name: tagNames.codeDigest(), value: 'aaaa1111' },
            { name: tagNames.artifactDigest(), value: 'aaaa1111' }
          ]
        }
      }
    ]);
  });

  // Review of #395: template object, tags and release must all describe the bytes the function runs.
  test('names the object of the code a session deployed directly, so template, tags and release agree', () => {
    const [decision] = decide({ tags: liveTags('bbbb2222'), objects: stored(TEMPLATE_KEY, SESSION_KEY) });
    expect(decision).toEqual({
      name: 'worker',
      keep: {
        s3Key: SESSION_KEY,
        digest: 'bbbb2222',
        identityTags: [
          { name: tagNames.codeDigest(), value: 'bbbb2222' },
          { name: tagNames.artifactDigest(), value: 'bbbb2222' }
        ]
      }
    });
  });

  test('reads the digest as fast deployments do when the two tags disagree', () => {
    // An older CLI updated only the code digest; its artifact tag is a leftover.
    const tags = [
      { key: tagNames.codeDigest(), value: 'bbbb2222' },
      { key: tagNames.artifactDigest(), value: 'aaaa1111' }
    ];
    const [decision] = decide({ tags, objects: stored(TEMPLATE_KEY, SESSION_KEY) });
    expect(decision && 'keep' in decision && decision.keep.s3Key).toBe(SESSION_KEY);
  });
});

describe('a kept function whose configuration changes is built', () => {
  const role = (statements: unknown[]) => ({
    Type: 'AWS::IAM::Role',
    Properties: { Policies: [{ PolicyName: 'p', PolicyDocument: { Statement: statements } }] }
  });
  const readQueue = { Effect: 'Allow', Action: 'sqs:ReceiveMessage', Resource: '*' };
  const writeBucket = { Effect: 'Allow', Action: 's3:PutObject', Resource: '*' };
  const deployed: Record<string, unknown> = {
    [WORKER]: deployedFunction(),
    [ROLE]: role([readQueue, writeBucket]),
    WorkerLogGroup: { Type: 'AWS::Logs::LogGroup', Properties: { RetentionInDays: 14 } },
    WorkerSqsMapping: { Type: 'AWS::Lambda::EventSourceMapping', Properties: { BatchSize: 10 } },
    JobsQueue: { Type: 'AWS::SQS::Queue', Properties: { VisibilityTimeout: 30 } }
  };
  const changed = (resources: Record<string, unknown>) =>
    findKeptFunctionsWithChangedConfiguration({
      functions: [{ name: 'worker', cfLogicalName: WORKER }],
      ownedLogicalNames: () => Object.keys(resources).filter((name) => name.startsWith('Worker')),
      template: { Resources: resources },
      deployedTemplate: { Resources: deployed }
    });
  const { WorkerSqsMapping: _mapping, ...withoutTrigger } = deployed;

  test.each<[string, Record<string, unknown>, string[]]>([
    ['nothing changes', deployed, []],
    // The session's code replaces the template object and its identity: not a configuration change.
    [
      'only the code it runs is realigned',
      {
        ...deployed,
        [WORKER]: deployedFunction({ Code: { S3Bucket: 'bucket', S3Key: SESSION_KEY }, Tags: identityTags('bbbb2222') })
      },
      []
    ],
    // Leaving it out removes its trigger and the permission the trigger needs.
    ['its trigger and the trigger permission are removed', { ...withoutTrigger, [ROLE]: role([writeBucket]) }, []],
    // Review of #395: the source and the configuration move from OLD_TOKEN to NEW_TOKEN.
    [
      'an environment variable is renamed',
      {
        ...deployed,
        [WORKER]: deployedFunction({
          Environment: { Variables: { NEW_TOKEN: 'xyz', QUEUE_URL: { Ref: 'JobsQueue' } } }
        })
      },
      ['worker']
    ],
    ['memory changes', { ...deployed, [WORKER]: deployedFunction({ MemorySize: 512 }) }, ['worker']],
    [
      'the role gains a permission',
      {
        ...deployed,
        [ROLE]: role([readQueue, writeBucket, { Effect: 'Allow', Action: 'sns:Publish', Resource: '*' }])
      },
      ['worker']
    ],
    [
      'a resource it owns changes',
      { ...deployed, WorkerLogGroup: { Type: 'AWS::Logs::LogGroup', Properties: { RetentionInDays: 30 } } },
      ['worker']
    ],
    ['it gets a new resource', { ...deployed, WorkerUrl: { Type: 'AWS::Lambda::Url', Properties: {} } }, ['worker']],
    [
      'a resource its environment refers to changes',
      { ...deployed, JobsQueue: { Type: 'AWS::SQS::Queue', Properties: { VisibilityTimeout: 60 } } },
      ['worker']
    ]
  ])('%s', (_case, resources, expected) => {
    expect(changed(resources)).toEqual(expected);
  });
});
