import type { CacheBehavior } from '@cloudform/cloudFront/distribution';
import type Distribution from '@cloudform/cloudFront/distribution';
import { join } from 'node:path';
import { globalStateManager } from '@application-services/global-state-manager';
import CloudfrontFunction from '@cloudform/cloudFront/function';
import { awsResourceNames } from '@shared/naming/aws-resource-names';
import { cfLogicalNames } from '@shared/naming/logical-names';
import { readdir, stat, pathExists } from 'fs-extra';

/**
 * Common type for SSR web resources that need host header rewrite
 */
export type SsrWebResourceBase = {
  name: string;
  nameChain: string[];
};

/**
 * Creates a CloudFront Function that rewrites the Host header to x-forwarded-host.
 * This is required for SSR frameworks to properly detect the request host.
 */
export const getHostHeaderRewriteCloudfrontFunction = (
  resourceName: string,
  awsResourceNameFn: (name: string, stackName: string, region: string) => string
) => {
  return new CloudfrontFunction({
    Name: awsResourceNameFn(resourceName, globalStateManager.targetStack.stackName, globalStateManager.region),
    AutoPublish: true,
    FunctionCode:
      '\nfunction handler(event) {\n  var request = event.request;\n  request.headers["x-forwarded-host"] = request.headers.host;\n  \n  return request;\n}',
    FunctionConfig: {
      Comment: resourceName,
      Runtime: 'cloudfront-js-1.0'
    }
  });
};

/**
 * Creates a template override function to set DefaultRootObject to empty string.
 * This allows the SSR framework to handle all routes including the root.
 */
export const getDistributionRootObjectTemplateOverride =
  (resourceName: string) => async (template: CloudformationTemplate) => {
    const cfLogicalNameOfResourceToModify = cfLogicalNames.cloudfrontDistribution(resourceName, 0);
    const distribution = template.Resources[cfLogicalNameOfResourceToModify] as Distribution;
    if (distribution) {
      distribution.Properties.DistributionConfig.DefaultRootObject = '';
    }
  };

/**
 * Creates a template override function to add cache behaviors for static assets.
 * Reads the built asset directory and creates a cache behavior for each top-level item.
 */
export const getStaticAssetsCacheBehaviorTemplateOverride =
  ({
    resourceName,
    assetsDirectoryPath,
    staticPathPrefix
  }: {
    resourceName: string;
    assetsDirectoryPath: string;
    staticPathPrefix?: string;
  }) =>
  async (template: CloudformationTemplate) => {
    const cfLogicalNameOfResourceToModify = cfLogicalNames.cloudfrontDistribution(resourceName, 0);
    const distribution = template.Resources[cfLogicalNameOfResourceToModify] as Distribution;
    if (!distribution) {
      return;
    }

    const cacheBehaviors = distribution.Properties.DistributionConfig.CacheBehaviors as CacheBehavior[];

    // Check if assets directory exists
    if (!(await pathExists(assetsDirectoryPath))) {
      return;
    }

    // Find the static files cache behaviour (last one with placeholder path)
    const staticBehaviourIndex = cacheBehaviors.findIndex(
      (b) => b.PathPattern === '<<TBD_STATIC>>' || (staticPathPrefix && b.PathPattern === `${staticPathPrefix}/*`)
    );

    if (staticBehaviourIndex === -1) {
      return;
    }

    const [staticFilesCacheBehaviour] = cacheBehaviors.splice(staticBehaviourIndex, 1);
    const assetsDirContents = await readdir(assetsDirectoryPath);

    const newCacheBehaviours = await Promise.all(
      assetsDirContents.map(async (item) => ({
        ...staticFilesCacheBehaviour,
        PathPattern: await stat(join(assetsDirectoryPath, item)).then((info) =>
          info.isDirectory() ? `${item}/*` : item
        )
      }))
    );

    // Add new behaviours, replacing if they already exist
    newCacheBehaviours.forEach((behaviour) => {
      const existingBehaviourIndex = cacheBehaviors.findIndex(
        ({ PathPattern }) => PathPattern === behaviour.PathPattern
      );
      if (existingBehaviourIndex === -1) {
        cacheBehaviors.push(behaviour);
      } else {
        cacheBehaviors[existingBehaviourIndex] = behaviour;
      }
    });
  };

/**
 * SSR Web resource types that use the same infrastructure pattern:
 * Lambda (server) + S3 (static) + CloudFront CDN
 */
export const SSR_WEB_RESOURCE_TYPES = [
  'astro-web',
  'nuxt-web',
  'sveltekit-web',
  'solidstart-web',
  'tanstack-web',
  'remix-web'
] as const;

export type SsrWebResourceType = (typeof SSR_WEB_RESOURCE_TYPES)[number];

/**
 * Framework-specific configuration for SSR web resources
 */
export type SsrWebFrameworkConfig = {
  /** Display name for TUI */
  displayName: string;
  /** Default dev command */
  defaultDevCommand: string;
  /** Default build command */
  defaultBuildCommand: string;
  /** Path to server output relative to app directory */
  serverOutputPath: string;
  /** Path to static assets relative to app directory */
  staticOutputPath: string;
  /** Prefix for static assets in the bucket (e.g., '_astro', '_nuxt') */
  staticAssetPrefix: string;
  /** Handler file path after build */
  handlerPath: string;
  /** Environment variable to set the Nitro/Vinxi preset */
  presetEnvVar?: string;
  /** Preset value for Lambda deployment */
  presetValue?: string;
  /** Wrapper type: 'passthrough' for Nitro-based, 'node-http' for Node.js HTTP handler, 'web-fetch' for Web Fetch API handler */
  wrapperType: 'passthrough' | 'node-http' | 'web-fetch';
  /** Required npm packages for the adapter (installed in user's project before build) */
  requiredAdapterPackages?: string[];
};

export const SSR_WEB_FRAMEWORK_CONFIGS: Record<SsrWebResourceType, SsrWebFrameworkConfig> = {
  'astro-web': {
    displayName: 'Astro',
    defaultDevCommand: 'astro dev',
    defaultBuildCommand: 'astro build',
    serverOutputPath: 'dist/server',
    staticOutputPath: 'dist/client',
    staticAssetPrefix: '_astro',
    handlerPath: 'entry.mjs',
    wrapperType: 'node-http',
    requiredAdapterPackages: ['@astrojs/node']
  },
  'nuxt-web': {
    displayName: 'Nuxt',
    defaultDevCommand: 'nuxt dev',
    defaultBuildCommand: 'nuxt build',
    serverOutputPath: '.output/server',
    staticOutputPath: '.output/public',
    staticAssetPrefix: '_nuxt',
    handlerPath: 'index.mjs',
    presetEnvVar: 'NITRO_PRESET',
    presetValue: 'aws-lambda',
    wrapperType: 'passthrough'
  },
  'solidstart-web': {
    displayName: 'SolidStart',
    defaultDevCommand: 'vinxi dev',
    defaultBuildCommand: 'vinxi build',
    serverOutputPath: '.output/server',
    staticOutputPath: '.output/public',
    staticAssetPrefix: '_build',
    handlerPath: 'index.mjs',
    presetEnvVar: 'NITRO_PRESET',
    presetValue: 'aws-lambda',
    wrapperType: 'passthrough'
  },
  'tanstack-web': {
    displayName: 'TanStack Start',
    defaultDevCommand: 'vinxi dev',
    defaultBuildCommand: 'vinxi build',
    serverOutputPath: '.output/server',
    staticOutputPath: '.output/public',
    staticAssetPrefix: '_build',
    handlerPath: 'index.mjs',
    presetEnvVar: 'NITRO_PRESET',
    presetValue: 'aws-lambda',
    wrapperType: 'passthrough'
  },
  'sveltekit-web': {
    displayName: 'SvelteKit',
    defaultDevCommand: 'vite dev',
    defaultBuildCommand: 'vite build',
    serverOutputPath: 'build',
    staticOutputPath: 'build/client',
    staticAssetPrefix: '_app',
    handlerPath: 'handler.js',
    wrapperType: 'node-http',
    requiredAdapterPackages: ['@sveltejs/adapter-node']
  },
  'remix-web': {
    displayName: 'Remix',
    defaultDevCommand: 'remix vite:dev',
    defaultBuildCommand: '@remix-run/dev vite:build',
    serverOutputPath: 'build/server',
    staticOutputPath: 'build/client',
    staticAssetPrefix: 'assets',
    handlerPath: 'index.js',
    wrapperType: 'web-fetch'
  }
};
