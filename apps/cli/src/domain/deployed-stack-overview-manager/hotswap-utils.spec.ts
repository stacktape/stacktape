import type { ResourceDifference } from '@aws-cdk/cloudformation-diff';
import { describe, expect, test } from 'bun:test';
import { diffTemplate } from '@aws-cdk/cloudformation-diff';
import {
  getTriggerOfUnchangedDeploymentScript,
  compareEcsTaskDefinitions,
  isCodeOnlyFunctionChange,
  isContentOnlyLayerChange,
  isImageOnlyTaskDefinitionChange
} from './hotswap-utils';

const change = (
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  attributes: { before?: Record<string, unknown>; after?: Record<string, unknown> } = {}
) =>
  ({
    oldValue: { ...attributes.before, Properties: before },
    newValue: { ...attributes.after, Properties: after }
  }) as unknown as ResourceDifference;
const isBuiltImage = (image: string) => image.startsWith('repo:');

describe('task definitions', () => {
  const container = (image: string, extra: Record<string, unknown> = {}) => ({
    Name: 'app',
    Image: image,
    Environment: [{ Name: 'MODE', Value: 'production' }],
    StopTimeout: 2,
    ...extra
  });
  const definition = (containers: unknown[]) => ({ Cpu: '256', Memory: '512', ContainerDefinitions: containers });

  test.each([
    ['a new image', [container('repo:v2')], true],
    ['a new image and environment variable', [container('repo:v2', { Environment: [] })], false],
    ['a new stop timeout', [container('repo:v1', { StopTimeout: 30 })], false],
    ['an added container', [container('repo:v1'), { ...container('repo:v1'), Name: 'sidecar' }], false],
    ['a new external image', [container('nginx:1.28')], false]
  ])('%s', (_, containers, fast) => {
    expect(
      isImageOnlyTaskDefinitionChange(change(definition([container('repo:v1')]), definition(containers)), isBuiltImage)
    ).toBe(fast);
  });

  test('an external image replaced by a built one, or an image given as a CloudFormation function', () => {
    expect(
      isImageOnlyTaskDefinitionChange(
        change(definition([container('nginx:1.27')]), definition([container('repo:v2')])),
        isBuiltImage
      )
    ).toBe(false);
    const intrinsic = { ...container('x'), Image: { 'Fn::Join': ['', ['repo:', 'v2']] } };
    expect(
      isImageOnlyTaskDefinitionChange(change(definition([container('repo:v1')]), definition([intrinsic])), isBuiltImage)
    ).toBe(false);
  });

  test('a new memory size or dependency', () => {
    const before = definition([container('repo:v1')]);
    const after = definition([container('repo:v2')]);
    expect(isImageOnlyTaskDefinitionChange(change(before, { ...after, Memory: '1024' }), isBuiltImage)).toBe(false);
    expect(
      isImageOnlyTaskDefinitionChange(change(before, after, { after: { DependsOn: ['Database'] } }), isBuiltImage)
    ).toBe(false);
  });
});

describe('functions', () => {
  const fn = (key: string, digest: string, extra: Record<string, unknown> = {}) => ({
    Code: { S3Bucket: 'bucket', S3Key: key },
    MemorySize: 256,
    Tags: [
      { Key: 'stp:code-digest', Value: digest },
      { Key: 'team', Value: 'payments' }
    ],
    ...extra
  });

  test.each([
    ['new code', fn('api/v2-b.zip', 'b'), true],
    ['new code and memory', fn('api/v2-b.zip', 'b', { MemorySize: 512 }), false],
    [
      'new code and a changed user tag',
      fn('api/v2-b.zip', 'b', { Tags: [{ Key: 'stp:code-digest', Value: 'b' }] }),
      false
    ],
    ['a new environment variable', fn('api/v1-a.zip', 'a', { Environment: { Variables: { A: '1' } } }), false]
  ])('%s', (_, after, fast) => {
    expect(isCodeOnlyFunctionChange(change(fn('api/v1-a.zip', 'a'), after))).toBe(fast);
  });

  test('new code and a new deletion policy', () => {
    expect(
      isCodeOnlyFunctionChange(
        change(fn('api/v1-a.zip', 'a'), fn('api/v2-b.zip', 'b'), { after: { DeletionPolicy: 'Retain' } })
      )
    ).toBe(false);
  });
});

describe('deployment scripts', () => {
  const script = (triggerType: string, forceUpdate: number, parameters = {}) => ({
    scriptFunction: { functionName: { Ref: 'MigrateFunction' }, triggerType, parameters },
    forceUpdate
  });

  test('an unchanged script reports its trigger', () => {
    expect(getTriggerOfUnchangedDeploymentScript(change(script('after:deploy', 1), script('after:deploy', 2)))).toBe(
      'after:deploy'
    );
    expect(getTriggerOfUnchangedDeploymentScript(change(script('before:delete', 1), script('before:delete', 2)))).toBe(
      'before:delete'
    );
  });

  test('a changed script or another custom resource reports nothing', () => {
    expect(
      getTriggerOfUnchangedDeploymentScript(change(script('after:deploy', 1), script('after:deploy', 2, { a: 1 })))
    ).toBeUndefined();
    expect(getTriggerOfUnchangedDeploymentScript(change({ codeDigest: 'a' }, { codeDigest: 'b' }))).toBeUndefined();
  });
});

describe('shared chunk layers', () => {
  const layer = (s3Key: string, extra: Record<string, unknown> = {}) => ({
    LayerName: 'shop-prod-shared-chunk-layer-1',
    Description: 'Shared chunk layer 1 for code splitting',
    CompatibleRuntimes: ['nodejs22.x'],
    Content: { S3Bucket: 'bucket', S3Key: s3Key },
    ...extra
  });

  test.each([
    ['new content', layer('shared-layer-1/bbbbbbbbbbbb.zip'), true],
    ['the same content', layer('shared-layer-1/aaaaaaaaaaaa.zip'), true],
    [
      'new content in another bucket',
      { ...layer('shared-layer-1/bbbbbbbbbbbb.zip'), Content: { S3Bucket: 'other', S3Key: 'x' } },
      true
    ],
    ['a new runtime', layer('shared-layer-1/bbbbbbbbbbbb.zip', { CompatibleRuntimes: ['nodejs24.x'] }), false],
    ['a new description', layer('shared-layer-1/bbbbbbbbbbbb.zip', { Description: 'renamed' }), false],
    ['a new name', layer('shared-layer-1/bbbbbbbbbbbb.zip', { LayerName: 'other' }), false]
  ])('%s', (_, after, fast) => {
    expect(isContentOnlyLayerChange(change(layer('shared-layer-1/aaaaaaaaaaaa.zip'), after))).toBe(fast);
  });

  test('a function whose shared layers tag and code changed is still a code-only change', () => {
    const fn = (digest: string, layers: string) => ({
      Runtime: 'nodejs22.x',
      Code: { S3Bucket: 'bucket', S3Key: `api/v000002-${digest}.zip` },
      Layers: [{ 'Fn::GetAtt': ['StpSharedChunkLayer1LayerVersion', 'LayerVersionArn'] }],
      Tags: [
        { Key: 'stp:code-digest', Value: digest },
        { Key: 'stp:shared-layers', Value: layers }
      ]
    });
    expect(isCodeOnlyFunctionChange(change(fn('d1', '1:aaaaaaaaaaaa'), fn('d2', '1:bbbbbbbbbbbb')))).toBe(true);
    // The tag appearing for the first time, on a stack deployed before layers were tagged, is a code-only change too.
    const untagged = fn('d1', '');
    untagged.Tags = untagged.Tags.filter(({ Key }) => Key === 'stp:code-digest');
    expect(isCodeOnlyFunctionChange(change(untagged, fn('d2', '1:bbbbbbbbbbbb')))).toBe(true);
    expect(isCodeOnlyFunctionChange(change(fn('d1', '1:a'), { ...fn('d2', '1:b'), Layers: [] }))).toBe(false);
  });

  // The differences the deploy judges come from the template differ, not from hand-made objects.
  test('a shared change in a real template diff changes only the layer content and the functions’ code', () => {
    const template = (hash: string) => ({
      Resources: {
        StpSharedChunkLayer1LayerVersion: {
          Type: 'AWS::Lambda::LayerVersion',
          Properties: layer(`shared-layer-1/${hash}.zip`)
        },
        ApiFunction: {
          Type: 'AWS::Lambda::Function',
          Properties: {
            Code: { S3Bucket: 'bucket', S3Key: `api/v000002-${hash}.zip` },
            Layers: [{ 'Fn::GetAtt': ['StpSharedChunkLayer1LayerVersion', 'LayerVersionArn'] }],
            Tags: [
              { Key: 'stp:code-digest', Value: hash },
              { Key: 'stp:shared-layers', Value: `1:${hash}` }
            ]
          }
        }
      }
    });
    const diff = diffTemplate(template('aaaaaaaaaaaa'), template('bbbbbbbbbbbb'));
    expect(Object.keys(diff.resources.changes).toSorted()).toEqual(['ApiFunction', 'StpSharedChunkLayer1LayerVersion']);
    expect(isContentOnlyLayerChange(diff.resources.changes.StpSharedChunkLayer1LayerVersion!)).toBe(true);
    expect(isCodeOnlyFunctionChange(diff.resources.changes.ApiFunction!)).toBe(true);
  });
});

test('ECS container ordering does not turn an image-only update into a task configuration change', () => {
  const current = {
    containerDefinitions: [
      { name: 'stp-cloudmap-drain', image: 'drain:1', essential: false },
      {
        name: 'service-container',
        image: 'app:1',
        essential: true,
        environment: [{ name: 'MODE', value: 'production' }]
      }
    ]
  };
  const calculated: Parameters<typeof compareEcsTaskDefinitions>[0]['calculatedTaskDefinition'] = {
    Type: 'AWS::ECS::TaskDefinition',
    Properties: {
      ContainerDefinitions: [
        {
          Name: 'service-container',
          Image: 'app:2',
          Essential: true,
          Environment: [{ Name: 'MODE', Value: 'production' }]
        },
        { Name: 'stp-cloudmap-drain', Image: 'drain:1', Essential: false }
      ]
    }
  };
  expect(
    compareEcsTaskDefinitions({
      currentTaskDefinition: current,
      calculatedTaskDefinition: calculated,
      ignoreImages: true
    }).needsUpdate
  ).toBe(false);
  expect(
    compareEcsTaskDefinitions({ currentTaskDefinition: current, calculatedTaskDefinition: calculated }).needsUpdate
  ).toBe(true);
  current.containerDefinitions[0]!.image = 'drain:2';
  expect(
    compareEcsTaskDefinitions({
      currentTaskDefinition: current,
      calculatedTaskDefinition: calculated,
      ignoreImages: true
    }).needsUpdate
  ).toBe(true);
  current.containerDefinitions[0]!.image = 'drain:1';
  current.containerDefinitions[1]!.environment![0]!.value = 'changed';
  expect(
    compareEcsTaskDefinitions({
      currentTaskDefinition: current,
      calculatedTaskDefinition: calculated,
      ignoreImages: true
    }).needsUpdate
  ).toBe(true);
});
