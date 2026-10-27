import type { CloudFormationTemplate } from '@stacktape/cloudformation/resource';
import { describe, expect, test } from 'bun:test';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import {
  Bucket,
  LambdaFunction,
  NextjsWeb,
  HttpApiGateway,
  ApplicationLoadBalancer,
  defineConfig
} from '@stacktape/config-authoring';
import type { BucketCdnConfiguration } from '@stacktape/config/buckets';
import { templateManager } from '../../src/domain/template-manager';

import { synthesizeFixture } from './synthesis-fixture';

/**
 * Bucket URL normalization and SPA routing need the origin-request edge Lambda. Custom metadata headers need the
 * origin-response one. The edge Lambdas do not wait for the edge deployment bucket resource: they create the bucket
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
  test('edge Lambda properties carry no local artifact path, which changes on every command', async () => {
    const template = await synthesize({ customHeaders: true });
    for (const logicalName of [requestLambda, responseLambda]) {
      const { edgeLambda } = (template.Resources[logicalName] as { Properties: { edgeLambda: Record<string, any> } })
        .Properties;
      expect(edgeLambda.artifactS3Key).toBeString();
      expect(JSON.stringify(edgeLambda)).not.toContain('artifactPath');
    }
  });
});

const customRequest = 'arn:aws:lambda:us-east-1:123456789999:function:custom:1';
const synthesizeOrigins = async ({
  origin = 'bucket',
  cdn = { enabled: true },
  bucketCdn,
  customHeaders = false
}: {
  origin?: 'bucket' | 'function' | 'http-api-gateway' | 'application-load-balancer';
  cdn?: BucketCdnConfiguration;
  bucketCdn?: BucketCdnConfiguration;
  customHeaders?: boolean;
} = {}) => {
  const compiledConfig = defineConfig(() => ({
    resources: {
      site: new Bucket({
        cdn: origin === 'bucket' ? cdn : bucketCdn,
        ...(customHeaders
          ? {
              directoryUpload: {
                directoryPath: './src',
                fileOptions: [{ includePattern: '*.html', headers: [{ key: 'x-frame-options', value: 'DENY' }] }]
              }
            }
          : {})
      }),
      app: new LambdaFunction({
        packaging: { type: 'js-bundle', properties: { entryfilePath: './src/api.ts' } },
        url: { enabled: true },
        cdn: origin === 'function' ? cdn : undefined
      }),
      api: new HttpApiGateway({ cdn: origin === 'http-api-gateway' ? cdn : undefined }),
      ...(origin === 'application-load-balancer'
        ? {
            web: new ApplicationLoadBalancer({ cdn: { ...cdn, originDomainName: 'example.com' } })
          }
        : {})
    }
  }))({
    projectName: 'characterization',
    stage: 'baseline',
    region: 'eu-west-1',
    cliArgs: {} as any,
    command: 'synth',
    awsProfile: '',
    user: { id: 'test-user', name: 'Test User', email: 'test@example.com' }
  });
  return synthesizeFixture({ compiledConfig, workingDir: join(import.meta.dir, 'fixtures', 'dense-application') });
};

type Behaviour = { LambdaFunctionAssociations?: { EventType: string; LambdaFunctionARN: unknown }[] };
type Distribution = { DefaultCacheBehavior: Behaviour; CacheBehaviors?: Behaviour[] };

const distributions = (template: CloudFormationTemplate): Distribution[] =>
  Object.values(template.Resources).flatMap((resource) =>
    resource.Type === 'AWS::CloudFront::Distribution'
      ? [(resource as { Properties: { DistributionConfig: Distribution } }).Properties.DistributionConfig]
      : []
  );
const requestAssociation = (template: CloudFormationTemplate) =>
  distributions(template).flatMap((distribution) =>
    [
      distribution.DefaultCacheBehavior,
      ...(Array.isArray(distribution.CacheBehaviors) ? distribution.CacheBehaviors : [])
    ].map(
      (behaviour) =>
        behaviour.LambdaFunctionAssociations?.find((association) => association.EventType === 'origin-request')
          ?.LambdaFunctionARN
    )
  );

describe('create only associated origin-request helpers', () => {
  test.each(['function', 'http-api-gateway', 'application-load-balancer'] as const)(
    '%s and its dynamic rewrites have no built-in edge function or deployment bucket',
    async (origin) => {
      const template = await synthesizeOrigins({
        origin,
        cdn: {
          enabled: true,
          routeRewrites: [
            { path: '/same/*', routePrefix: '/v2' },
            { path: '/fn/*', routeTo: { type: 'function', properties: { functionName: 'app' } } },
            { path: '/api/*', routeTo: { type: 'http-api-gateway', properties: { httpApiGatewayName: 'api' } } },
            { path: '/custom/*', routeTo: { type: 'custom-origin', properties: { domainName: 'example.com' } } }
          ]
        }
      });
      expect(template.Resources[requestLambda]).toBeUndefined();
      expect(template.Resources[cfLogicalNames.customResourceEdgeLambdaBucket()]).toBeUndefined();
      expect(requestAssociation(template)).toEqual([undefined, undefined, undefined, undefined, undefined]);
    }
  );

  test('a raw bucket needs neither request helper nor edge bucket', async () => {
    const template = await synthesizeOrigins({ cdn: { enabled: true, disableUrlNormalization: true } });
    expect(template.Resources[requestLambda]).toBeUndefined();
    expect(template.Resources[cfLogicalNames.customResourceEdgeLambdaBucket()]).toBeUndefined();
    expect(requestAssociation(template)).toEqual([undefined]);
  });

  test('SPA fallback still needs the helper when URL normalization is disabled', async () => {
    const template = await synthesizeOrigins({
      cdn: {
        enabled: true,
        disableUrlNormalization: true,
        rewriteRoutesForSinglePageApp: true
      }
    });
    expect(template.Resources[requestLambda]).toBeDefined();
    expect(requestAssociation(template)).toEqual([{ 'Fn::GetAtt': [requestLambda, 'versionArn'] }]);
  });

  test('a bucket rewrite on a function CDN creates the helper only for that behaviour', async () => {
    const template = await synthesizeOrigins({
      origin: 'function',
      cdn: {
        enabled: true,
        routeRewrites: [
          { path: '/static/*', routeTo: { type: 'bucket', properties: { bucketName: 'site' } } },
          {
            path: '/raw/*',
            routeTo: { type: 'bucket', properties: { bucketName: 'site', disableUrlNormalization: true } }
          },
          {
            path: '/custom/*',
            routeTo: { type: 'bucket', properties: { bucketName: 'site' } },
            edgeFunctions: { onOriginRequest: customRequest }
          }
        ]
      }
    });
    expect(template.Resources[requestLambda]).toBeDefined();
    expect(requestAssociation(template)).toEqual([
      undefined,
      { 'Fn::GetAtt': [requestLambda, 'versionArn'] },
      undefined,
      customRequest
    ]);
  });

  test('same-bucket rewrites keep normalization independently of the default behaviour', async () => {
    const template = await synthesizeOrigins({
      cdn: {
        enabled: true,
        disableUrlNormalization: true,
        routeRewrites: [{ path: '/docs/*' }]
      }
    });
    expect(template.Resources[requestLambda]).toBeDefined();
    expect(requestAssociation(template)).toEqual([undefined, { 'Fn::GetAtt': [requestLambda, 'versionArn'] }]);
  });

  test('a custom origin-request function replaces the built-in helper', async () => {
    const template = await synthesizeOrigins({
      cdn: {
        enabled: true,
        edgeFunctions: { onOriginRequest: customRequest }
      }
    });
    expect(template.Resources[requestLambda]).toBeUndefined();
    expect(requestAssociation(template)).toEqual([customRequest]);
  });

  test('custom metadata headers still provision the response helper and its bucket without a request helper', async () => {
    const template = await synthesizeOrigins({
      customHeaders: true,
      cdn: { enabled: true, disableUrlNormalization: true }
    });
    expect(template.Resources[requestLambda]).toBeUndefined();
    expect(template.Resources[responseLambda]).toBeDefined();
    expect(template.Resources[cfLogicalNames.customResourceEdgeLambdaBucket()]).toBeDefined();
    expect(edgeAssociations(template)).toEqual([responseLambda]);
  });

  test('a Next.js edge server keeps the resource that deletes its edge deployment bucket', async () => {
    const appDirectory = mkdtempSync(join(tmpdir(), 'stp-nextjs-edge-'));
    writeFileSync(join(appDirectory, 'next.config.mjs'), 'export default {};\n');
    const compiledConfig = defineConfig(() => ({
      resources: { site: new NextjsWeb({ appDirectory: './', useEdgeLambda: true }) }
    }))({
      projectName: 'characterization',
      stage: 'baseline',
      region: 'eu-west-1',
      cliArgs: {} as any,
      command: 'synth',
      awsProfile: '',
      user: { id: 'test-user', name: 'Test User', email: 'test@example.com' }
    });
    // Finalization needs the OpenNext build output, so the resolved resources are read before it.
    let template: CloudFormationTemplate | undefined;
    const resolved = new Error('resolved');
    await synthesizeFixture({
      compiledConfig,
      workingDir: appDirectory,
      beforeFinalize: () => {
        template = templateManager.getTemplate();
        throw resolved;
      }
    })
      .catch((error) => {
        if (error !== resolved) throw error;
      })
      .finally(() => rmSync(appDirectory, { recursive: true, force: true }));
    if (!template) throw new Error('The Next.js site was not resolved.');
    expect(template.Resources[requestLambda]).toBeUndefined();
    expect(
      Object.keys(template.Resources).filter((logicalName) => logicalName.endsWith('EdgeLambdaCustomResource'))
    ).toEqual([cfLogicalNames.customResourceEdgeLambda('siteServerEdgeFunction')]);
    expect(template.Resources[cfLogicalNames.customResourceEdgeLambdaBucket()]).toBeDefined();
  });
});
