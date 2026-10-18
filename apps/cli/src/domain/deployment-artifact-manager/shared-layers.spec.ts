import { describe, expect, test } from 'bun:test';
import {
  buildRepublishedLayerS3Key,
  describeFastDeploymentLayerVersion,
  needsLayerRepublish,
  formatSharedLayersTag,
  getDeployedSharedLayers,
  getFunctionCodeDigest,
  getSharedLayersOfFunctionInTemplate,
  getSharedLayersOfTemplate,
  parseFastDeploymentLayerVersion,
  parseSharedLayersTag,
  replaceSharedLayerArns,
  resolveTemplateLayerArns,
  selectSupersededLayerVersions,
  sharedLayerIdentity,
  sharedLayerNumberOf
} from './shared-layers';

const layerArn = (name: string, version: number) => `arn:aws:lambda:eu-west-1:123456789012:layer:${name}:${version}`;

test('runtime identity changes with a layer even when the function ZIP is unchanged', () => {
  expect(getFunctionCodeDigest('same-zip', [{ layerNumber: 1, identity: 'old' }])).not.toBe(
    getFunctionCodeDigest('same-zip', [{ layerNumber: 1, identity: 'new' }])
  );
  expect(getFunctionCodeDigest('same-zip')).toBe('same-zip');
});

/** A template with two functions: `api` uses chunk layer 1 and a user layer, `worker` uses layers 0 and 1. */
const template = (layerKeys: Record<number, string> = { 0: 'aaaaaaaaaaaa', 1: 'bbbbbbbbbbbb' }) => ({
  Resources: {
    StpSharedChunkLayer0LayerVersion: {
      Type: 'AWS::Lambda::LayerVersion',
      Properties: {
        LayerName: 'shop-prod-shared-chunk-layer-0',
        Content: { S3Bucket: 'bucket', S3Key: `shared-layer-0/${layerKeys[0]}.zip` }
      }
    },
    StpSharedChunkLayer1LayerVersion: {
      Type: 'AWS::Lambda::LayerVersion',
      Properties: {
        LayerName: 'shop-prod-shared-chunk-layer-1',
        Content: { S3Bucket: 'bucket', S3Key: `shared-layer-1/${layerKeys[1]}.zip` }
      }
    },
    ApiFunction: {
      Type: 'AWS::Lambda::Function',
      Properties: {
        Layers: [
          'arn:aws:lambda:eu-west-1:123456789012:layer:user-layer:3',
          { 'Fn::GetAtt': ['StpSharedChunkLayer1LayerVersion', 'LayerVersionArn'] }
        ]
      }
    },
    WorkerFunction: {
      Type: 'AWS::Lambda::Function',
      Properties: {
        Layers: [
          { 'Fn::GetAtt': ['StpSharedChunkLayer0LayerVersion', 'LayerVersionArn'] },
          { 'Fn::GetAtt': ['StpSharedChunkLayer1LayerVersion', 'LayerVersionArn'] }
        ]
      }
    },
    PlainFunction: { Type: 'AWS::Lambda::Function', Properties: {} }
  }
});

describe('shared layer identity', () => {
  test('is the hash segment of the layer S3 key, shared with the copies releases make of it', () => {
    expect(sharedLayerIdentity('shared-layer-1/bbbbbbbbbbbb.zip')).toBe('bbbbbbbbbbbb');
    expect(sharedLayerIdentity('shared-layer-1/bbbbbbbbbbbb-v000013.zip')).toBe('bbbbbbbbbbbb');
    expect(buildRepublishedLayerS3Key('shared-layer-1/bbbbbbbbbbbb.zip', 'v000013')).toBe(
      'shared-layer-1/bbbbbbbbbbbb-v000013.zip'
    );
    expect(buildRepublishedLayerS3Key('shared-layer-1/bbbbbbbbbbbb-v000013.zip', 'v000014')).toBe(
      'shared-layer-1/bbbbbbbbbbbb-v000014.zip'
    );
  });

  test('a layer is republished only when CloudFormation would leave a function on another version', () => {
    const cases: [string, Parameters<typeof needsLayerRepublish>[0], boolean][] = [
      [
        'a function runs a published version of other content',
        { identity: 'a', cfnIdentity: 'a', deployedIdentities: ['b', 'a'] },
        true
      ],
      [
        'every function runs the content',
        { identity: 'a', cfnIdentity: 'a', deployedIdentities: ['a', undefined] },
        false
      ],
      [
        'the content differs from CloudFormation’s, which replaces the layer',
        { identity: 'b', cfnIdentity: 'a', deployedIdentities: ['c'] },
        false
      ],
      ['the layer is new', { identity: 'a', cfnIdentity: undefined, deployedIdentities: [undefined] }, false]
    ];
    for (const [name, input, expected] of cases) expect(needsLayerRepublish(input), name).toBe(expected);
  });

  test('is read from the template resource names Stacktape gives shared layers', () => {
    expect(sharedLayerNumberOf('StpSharedChunkLayer0LayerVersion')).toBe(0);
    expect(sharedLayerNumberOf('StpSharedChunkLayer5LayerVersion')).toBe(5);
    expect(sharedLayerNumberOf('ApiFunction')).toBeUndefined();
    expect(sharedLayerNumberOf('StpSharedChunkLayer6LayerVersion')).toBeUndefined();
  });
});

describe('the shared layers tag', () => {
  test('round-trips layers in number order', () => {
    const value = formatSharedLayersTag([
      { layerNumber: 1, identity: 'bbbbbbbbbbbb' },
      { layerNumber: 0, identity: 'aaaaaaaaaaaa' }
    ]);
    expect(value).toBe('0:aaaaaaaaaaaa/1:bbbbbbbbbbbb');
    expect([...parseSharedLayersTag(value)!]).toEqual([
      [0, 'aaaaaaaaaaaa'],
      [1, 'bbbbbbbbbbbb']
    ]);
  });

  test('uses only characters a Lambda tag value may hold', () => {
    const value = formatSharedLayersTag([
      { layerNumber: 0, identity: 'v000003-aaaaaaaaaaaa' },
      { layerNumber: 1, identity: 'bbbbbbbbbbbb' }
    ]);
    expect(value).toMatch(/^[\p{L}\p{N}\s_.:/=+\-@]*$/u);
  });

  test('distinguishes a missing tag from an empty or damaged one', () => {
    expect(parseSharedLayersTag(undefined)).toBeUndefined();
    expect([...parseSharedLayersTag('')!]).toEqual([]);
    expect([...parseSharedLayersTag('x:1/2:/3')!]).toEqual([]);
  });
});

describe('what a deployed function runs', () => {
  test('comes from the template when the function carries no tag', () => {
    expect([...getSharedLayersOfFunctionInTemplate(template(), 'WorkerFunction')]).toEqual([
      [0, 'aaaaaaaaaaaa'],
      [1, 'bbbbbbbbbbbb']
    ]);
    expect([...getSharedLayersOfFunctionInTemplate(template(), 'ApiFunction')]).toEqual([[1, 'bbbbbbbbbbbb']]);
    expect([...getSharedLayersOfFunctionInTemplate(template(), 'PlainFunction')]).toEqual([]);
    expect([...getSharedLayersOfFunctionInTemplate({ Resources: {} }, 'Gone')]).toEqual([]);
  });

  test('comes from the tag a fast deployment wrote, even when the template says otherwise', () => {
    const tags = [
      { key: 'stp:code-digest', value: 'abc' },
      { key: 'stp:shared-layers', value: '1:cccccccccccc' }
    ];
    const deployed = getDeployedSharedLayers({
      tags,
      deployedTemplate: template(),
      functionLogicalName: 'ApiFunction'
    });
    expect([...deployed]).toEqual([[1, 'cccccccccccc']]);
    const untagged = getDeployedSharedLayers({
      tags: [{ key: 'stp:code-digest', value: 'abc' }],
      deployedTemplate: template(),
      functionLogicalName: 'ApiFunction'
    });
    expect([...untagged]).toEqual([[1, 'bbbbbbbbbbbb']]);
  });

  test('lists the layers a template declares', () => {
    expect(getSharedLayersOfTemplate(template())).toEqual([
      { layerNumber: 0, layerName: 'shop-prod-shared-chunk-layer-0' },
      { layerNumber: 1, layerName: 'shop-prod-shared-chunk-layer-1' }
    ]);
    expect(getSharedLayersOfTemplate({ Resources: {} })).toEqual([]);
  });

  test('an interrupted layer update forces a restore even when the target matches CloudFormation', () => {
    const deployed = getDeployedSharedLayers({
      tags: [{ key: 'stp:shared-layers', value: 'updating' }],
      deployedTemplate: template(),
      functionLogicalName: 'ApiFunction'
    });
    expect(deployed.get(1)).toBe('updating');
    expect(
      needsLayerRepublish({
        identity: 'bbbbbbbbbbbb',
        cfnIdentity: 'bbbbbbbbbbbb',
        deployedIdentities: [deployed.get(1)]
      })
    ).toBe(true);
  });
});

describe('the layers a function is given', () => {
  const arns = new Map([
    [0, layerArn('shop-prod-shared-chunk-layer-0', 4)],
    [1, layerArn('shop-prod-shared-chunk-layer-1', 7)]
  ]);

  test('follow the template order, user layers included', () => {
    expect(resolveTemplateLayerArns(template(), 'ApiFunction', arns)).toEqual([
      'arn:aws:lambda:eu-west-1:123456789012:layer:user-layer:3',
      layerArn('shop-prod-shared-chunk-layer-1', 7)
    ]);
    expect(resolveTemplateLayerArns(template(), 'WorkerFunction', arns)).toEqual([
      layerArn('shop-prod-shared-chunk-layer-0', 4),
      layerArn('shop-prod-shared-chunk-layer-1', 7)
    ]);
    expect(resolveTemplateLayerArns(template(), 'PlainFunction', arns)).toEqual([]);
  });

  test('cannot be resolved from a template that references a layer another way', () => {
    const withReference = template();
    (withReference.Resources.ApiFunction.Properties.Layers as unknown[]).push({ Ref: 'CustomLayer' });
    expect(resolveTemplateLayerArns(withReference, 'ApiFunction', arns)).toBeUndefined();
    expect(resolveTemplateLayerArns(template(), 'WorkerFunction', new Map([[1, 'arn:1']]))).toBeUndefined();
  });

  test('are otherwise the running layers with each shared layer replaced in place', () => {
    const running = [
      'arn:aws:lambda:eu-west-1:123456789012:layer:user-layer:3',
      layerArn('shop-prod-shared-chunk-layer-1', 2),
      'arn:aws:lambda:eu-west-1:901920570:layer:aws-otel-nodejs-amd64-ver-1-30-0:1'
    ];
    expect(
      replaceSharedLayerArns(running, [
        { layerName: 'shop-prod-shared-chunk-layer-1', arn: layerArn('shop-prod-shared-chunk-layer-1', 7) },
        { layerName: 'shop-prod-shared-chunk-layer-0', arn: layerArn('shop-prod-shared-chunk-layer-0', 4) }
      ])
    ).toEqual([
      'arn:aws:lambda:eu-west-1:123456789012:layer:user-layer:3',
      layerArn('shop-prod-shared-chunk-layer-1', 7),
      'arn:aws:lambda:eu-west-1:901920570:layer:aws-otel-nodejs-amd64-ver-1-30-0:1',
      layerArn('shop-prod-shared-chunk-layer-0', 4)
    ]);
  });
});

describe('layer versions a fast deployment publishes', () => {
  test('carry their content in the description, which identifies them later', () => {
    const description = describeFastDeploymentLayerVersion('Shared chunk layer 1 for code splitting', 'bbbbbbbbbbbb');
    expect(description).toBe('Shared chunk layer 1 for code splitting (stp:fast-deployment bbbbbbbbbbbb)');
    expect(parseFastDeploymentLayerVersion(description)).toBe('bbbbbbbbbbbb');
    expect(parseFastDeploymentLayerVersion('Shared chunk layer 1 for code splitting')).toBeUndefined();
    expect(parseFastDeploymentLayerVersion(undefined)).toBeUndefined();
    expect(describeFastDeploymentLayerVersion(undefined, 'x')).toBe('Shared chunk layer (stp:fast-deployment x)');
  });

  test('are deleted once nothing runs them, and never CloudFormation’s versions', () => {
    const name = 'shop-prod-shared-chunk-layer-1';
    const versions = [
      { arn: layerArn(name, 1), description: 'Shared chunk layer 1 for code splitting' },
      { arn: layerArn(name, 2), description: describeFastDeploymentLayerVersion(undefined, 'old') },
      { arn: layerArn(name, 3), description: describeFastDeploymentLayerVersion(undefined, 'current') },
      { arn: layerArn(name, 4), description: describeFastDeploymentLayerVersion(undefined, 'orphan') }
    ];
    expect(
      selectSupersededLayerVersions({ versions, arnsInUse: [layerArn(name, 3), layerArn(name, 1)] }).map(
        ({ arn }) => arn
      )
    ).toEqual([layerArn(name, 2), layerArn(name, 4)]);
    expect(selectSupersededLayerVersions({ versions: versions.slice(0, 1), arnsInUse: [] })).toEqual([]);
  });
});
