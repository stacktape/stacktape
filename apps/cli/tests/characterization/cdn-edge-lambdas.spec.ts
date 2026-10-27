import type { CloudFormationTemplate } from '@stacktape/cloudformation/resource';
import { describe, expect, test } from 'bun:test';
import { join } from 'node:path';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { Bucket, defineConfig } from '@stacktape/config-authoring';
import { synthesizeFixture } from './synthesis-fixture';

/**
 * A CDN gets Stacktape's origin-request edge Lambda, and the origin-response one only when a bucket's custom metadata
 * headers need it. The edge Lambdas do not wait for the edge deployment bucket resource: they create the bucket
 * themselves, so CloudFront can start one custom-resource round trip earlier.
 */

const createConfig = ({ customHeaders }: { customHeaders: boolean }) =>
  defineConfig(() => {
    const site = new Bucket({
      directoryUpload: {
        directoryPath: './src',
        ...(customHeaders
          ? { fileOptions: [{ includePattern: '*.html', headers: [{ key: 'x-frame-options', value: 'DENY' }] }] }
          : {})
      },
      cdn: { enabled: true }
    });
    return { resources: { site } };
  })({
    projectName: 'characterization',
    stage: 'baseline',
    region: 'eu-west-1',
    cliArgs: {} as any,
    command: 'synth',
    awsProfile: '',
    user: { id: 'test-user', name: 'Test User', email: 'test@example.com' }
  });

const synthesize = (options: Parameters<typeof createConfig>[0]) =>
  synthesizeFixture({
    compiledConfig: createConfig(options),
    workingDir: join(import.meta.dir, 'fixtures', 'dense-application')
  });

const requestLambda = cfLogicalNames.customResourceEdgeLambda('cdnOriginRequestLambda');
const responseLambda = cfLogicalNames.customResourceEdgeLambda('cdnOriginResponseLambda');

const edgeAssociations = (template: CloudFormationTemplate) =>
  Object.values(template.Resources)
    .filter((resource) => (resource as { Type: string }).Type === 'AWS::CloudFront::Distribution')
    .flatMap(
      (resource) =>
        (
          resource as {
            Properties: {
              DistributionConfig: {
                DefaultCacheBehavior: {
                  LambdaFunctionAssociations?: { LambdaFunctionARN: { 'Fn::GetAtt': string[] } }[];
                };
              };
            };
          }
        ).Properties.DistributionConfig.DefaultCacheBehavior.LambdaFunctionAssociations ?? []
    )
    .map(({ LambdaFunctionARN }) => LambdaFunctionARN['Fn::GetAtt'][0]);

describe('CDN edge Lambdas', () => {
  test('a CDN without custom metadata headers gets only the origin-request Lambda', async () => {
    const template = await synthesize({ customHeaders: false });
    expect(template.Resources[requestLambda]).toBeDefined();
    expect(template.Resources[responseLambda]).toBeUndefined();
    expect(edgeAssociations(template)).toEqual([requestLambda]);
    expect(template.Resources[cfLogicalNames.customResourceEdgeLambdaBucket()]).toBeDefined();
  });

  test('custom metadata headers add the origin-response Lambda and associate it', async () => {
    const template = await synthesize({ customHeaders: true });
    expect(template.Resources[responseLambda]).toBeDefined();
    expect(edgeAssociations(template).toSorted()).toEqual([requestLambda, responseLambda].toSorted());
  });

  test('edge Lambdas do not wait for the edge deployment bucket resource', async () => {
    const template = await synthesize({ customHeaders: true });
    for (const logicalName of [requestLambda, responseLambda]) {
      expect((template.Resources[logicalName] as { DependsOn?: string[] }).DependsOn ?? []).not.toContain(
        cfLogicalNames.customResourceEdgeLambdaBucket()
      );
    }
  });
});
