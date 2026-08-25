import { afterEach, describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { CloudFormationTemplate, KnownCloudFormationResource } from '@stacktape/cloudformation/resource';
import type {
  CacheBehavior,
  DistributionConfig
} from '@stacktape/cloudformation/resources/aws-cloudfront-distribution';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import {
  getSsrWebStaticAssetPrefixes,
  getStaticAssetCachePathPatterns,
  getStaticAssetsCacheBehaviorTemplateOverride,
  SSR_WEB_FRAMEWORK_CONFIGS
} from './ssr-web-shared';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.map((directory) => rm(directory, { force: true, recursive: true })));
  temporaryDirectories.length = 0;
});

describe('SSR static asset cache paths', () => {
  test('uses one stable lexical order for files and directories', async () => {
    const assetsDirectory = await mkdtemp(join(tmpdir(), 'stacktape-ssr-assets-'));
    temporaryDirectories.push(assetsDirectory);
    await writeFile(join(assetsDirectory, 'z-runtime.js'), 'runtime');
    await mkdir(join(assetsDirectory, 'a-assets'));
    await writeFile(join(assetsDirectory, 'm-styles.css'), 'styles');

    expect(await getStaticAssetCachePathPatterns(assetsDirectory)).toEqual([
      'a-assets/*',
      'm-styles.css',
      'z-runtime.js'
    ]);
  });

  test.each([
    { emittedPrefix: 'assets', absentPrefix: '_build' },
    { emittedPrefix: '_build', absentPrefix: 'assets' }
  ])(
    'keeps only the TanStack output prefix emitted by packaging: $emittedPrefix',
    async ({ emittedPrefix, absentPrefix }) => {
      const assetsDirectory = await mkdtemp(join(tmpdir(), 'stacktape-tanstack-assets-'));
      temporaryDirectories.push(assetsDirectory);
      await mkdir(join(assetsDirectory, emittedPrefix));

      const resourceName = 'siteServerFunction';
      const distributionLogicalName = cfLogicalNames.cloudfrontDistribution(resourceName, 0);
      const template = {
        Resources: {
          [distributionLogicalName]: {
            Type: 'AWS::CloudFront::Distribution',
            Properties: {
              DistributionConfig: {
                CacheBehaviors: [
                  { PathPattern: 'api/*', TargetOriginId: 'server' },
                  { PathPattern: 'assets/*', TargetOriginId: 'bucket' },
                  { PathPattern: '_build/*', TargetOriginId: 'bucket' }
                ]
              }
            }
          }
        }
      } as unknown as CloudFormationTemplate;

      await getStaticAssetsCacheBehaviorTemplateOverride({
        resourceName,
        assetsDirectoryPath: assetsDirectory,
        staticPathPrefixes: getSsrWebStaticAssetPrefixes(SSR_WEB_FRAMEWORK_CONFIGS['tanstack-web'])
      })(template);

      const distribution = template.Resources[
        distributionLogicalName
      ] as KnownCloudFormationResource<'AWS::CloudFront::Distribution'>;
      const cacheBehaviors = (distribution.Properties.DistributionConfig as DistributionConfig)
        .CacheBehaviors as CacheBehavior[];
      expect(cacheBehaviors.map(({ PathPattern }) => PathPattern)).toEqual(['api/*', `${emittedPrefix}/*`]);
      expect(cacheBehaviors.find(({ PathPattern }) => PathPattern === `${emittedPrefix}/*`)?.TargetOriginId).toBe(
        'bucket'
      );
      expect(cacheBehaviors.some(({ PathPattern }) => PathPattern === `${absentPrefix}/*`)).toBe(false);
    }
  );
});

describe('SSR web framework defaults', () => {
  test('tanstack-web packages current Vite, Rsbuild, and legacy Nitro outputs', () => {
    const config = SSR_WEB_FRAMEWORK_CONFIGS['tanstack-web'];
    expect(config).toEqual({
      displayName: 'TanStack Start',
      defaultDevCommand: 'vite dev',
      defaultBuildCommand: 'vite build',
      serverOutputPath: 'dist/server',
      staticOutputPath: 'dist/client',
      staticAssetPrefix: 'assets',
      handlerPath: 'server.js',
      presetEnvVar: 'NITRO_PRESET',
      presetValue: 'aws-lambda',
      wrapperType: 'tanstack-fetch',
      fallbackOutputVariants: [
        {
          serverOutputPath: 'dist/server',
          staticOutputPath: 'dist/client',
          staticAssetPrefix: 'assets',
          handlerFileName: 'index.js',
          wrapperType: 'tanstack-fetch'
        },
        {
          serverOutputPath: '.output/server',
          staticOutputPath: '.output/public',
          staticAssetPrefix: '_build',
          handlerFileName: 'index.mjs',
          wrapperType: 'passthrough'
        }
      ]
    });
  });
});
