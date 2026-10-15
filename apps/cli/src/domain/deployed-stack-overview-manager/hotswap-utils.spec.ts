import type { ResourceDifference } from '@aws-cdk/cloudformation-diff';
import { describe, expect, test } from 'bun:test';
import {
  getTriggerOfUnchangedDeploymentScript,
  isCodeOnlyFunctionChange,
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
