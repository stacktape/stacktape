import { describe, expect, test } from 'bun:test';
import type { CloudFormationTemplate } from '@stacktape/cloudformation/resource';
import {
  getFunctionAliases,
  getSourceMapManifest,
  selectObsoleteSourceMapKeys,
  sourceMapKeyForArtifact
} from './source-maps';

const bucket = 'stp-deployment-bucket-abc123';
const lambda = (name: string, s3Key: string, layers: unknown[] = [], bucketName = bucket) => ({
  Type: 'AWS::Lambda::Function',
  Properties: { FunctionName: name, Code: { S3Bucket: bucketName, S3Key: s3Key }, Layers: layers }
});
const layer = (s3Key: string) => ({
  Type: 'AWS::Lambda::LayerVersion',
  Properties: { Content: { S3Bucket: bucket, S3Key: s3Key } }
});

describe('which stored maps describe each deployed function', () => {
  const template = {
    Resources: {
      ApiFunction: lambda('shop-dev-api', 'api/v000003-d1.zip', [
        { 'Fn::GetAtt': ['SharedChunkLayer1', 'LayerVersionArn'] },
        { 'Fn::GetAtt': ['SharedChunkLayer0', 'LayerVersionArn'] },
        'arn:aws:lambda:eu-west-1:123456789012:layer:users-own:1'
      ]),
      SharedChunkLayer1: layer('shared-layer-1/h1.zip'),
      // A native dependency layer carries no JavaScript of the build, so it has no maps.
      SharedChunkLayer0: layer('shared-layer-0/n0.zip'),
      // Built with `keepSourceMapsInPackage` or before maps left the package: nothing stored.
      WorkerFunction: lambda('shop-dev-worker', 'worker/v000003-d2.zip'),
      ServiceFunction: lambda('shop-dev-stacktapeServiceLambda', 'stacktapeServiceLambda/v000001-h.zip'),
      ImportedFunction: lambda('shop-dev-imported', 'imported/v000001-d3.zip', [], 'someone-elses-bucket')
    }
  } as unknown as CloudFormationTemplate;

  test('names the function and layer bundles that are stored, under the digest the function is tagged with', () => {
    const storedKeys = new Set([
      'source-maps/api/d1.json',
      'source-maps/shared-layer-1/h1.json',
      'source-maps/imported/d3.json'
    ]);

    expect(getSourceMapManifest({ template, deploymentBucketName: bucket, storedKeys })).toEqual({
      functions: [
        {
          lambdaName: 'shop-dev-api',
          digest: 'd1',
          sourceMapKeys: ['source-maps/api/d1.json', 'source-maps/shared-layer-1/h1.json']
        }
      ]
    });
  });

  test('a rollback copies code under a new release, and the copy keeps its maps', () => {
    expect(sourceMapKeyForArtifact('api/v000009-d1.zip')).toBe(sourceMapKeyForArtifact('api/v000003-d1.zip'));
    expect(sourceMapKeyForArtifact('api/v000003-d1.zip')).toBe('source-maps/api/d1.json');
    expect(sourceMapKeyForArtifact('shared-layer-1/h1.zip')).toBe('source-maps/shared-layer-1/h1.json');
    expect(sourceMapKeyForArtifact('cf-template/v000003.yml')).toBeUndefined();
    expect(sourceMapKeyForArtifact('stacktapeServiceLambda/v000001-h.zip')).toBeUndefined();
  });
});

describe('which stored maps a deployment deletes', () => {
  test('a bundle stays while any artifact with its digest remains, and goes with the last one', () => {
    const storedKeys = [
      'source-maps/api/d1.json',
      'source-maps/api/d2.json',
      'source-maps/shared-layer-1/h1.json',
      'source-maps/shared-layer-1/h2.json',
      'source-maps/removed-function/d9.json'
    ];

    expect(
      selectObsoleteSourceMapKeys({
        storedKeys,
        remainingArtifactKeys: [
          // d1 is retained twice: once as built, once copied by a rollback.
          'api/v000001-d1.zip',
          'api/v000004-d1.zip',
          'shared-layer-1/h2.zip',
          'cf-template/v000004.yml'
        ]
      })
    ).toEqual([
      'source-maps/api/d2.json',
      'source-maps/shared-layer-1/h1.json',
      'source-maps/removed-function/d9.json'
    ]);
  });
});

describe('which functions run published versions', () => {
  test('a function behind an alias is found by the alias that references it', () => {
    const template = {
      Resources: {
        ApiFunction: lambda('shop-dev-api', 'api/v000003-d1.zip'),
        WorkerFunction: lambda('shop-dev-worker', 'worker/v000003-d2.zip'),
        ApiStpAlias: {
          Type: 'AWS::Lambda::Alias',
          Properties: {
            FunctionName: { Ref: 'ApiFunction' },
            FunctionVersion: { 'Fn::GetAtt': ['ApiVersionPublisher', 'version'] },
            Name: 'stp-alias'
          }
        }
      }
    } as unknown as CloudFormationTemplate;

    expect(getFunctionAliases(template)).toEqual({ 'shop-dev-api': 'stp-alias' });
  });
});
