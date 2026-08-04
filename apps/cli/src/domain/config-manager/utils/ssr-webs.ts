import { getAtt, ref } from '@stacktape/cloudformation/intrinsics';
import type { StpAstroWeb } from '@domain-services/config-manager/resolved-types/astro-web';
import type { StpBucket } from '@domain-services/config-manager/resolved-types/buckets';
import type { StpLambdaFunction } from '@domain-services/config-manager/resolved-types/functions';
import type { StpNuxtWeb } from '@domain-services/config-manager/resolved-types/nuxt-web';
import type { StpRemixWeb } from '@domain-services/config-manager/resolved-types/remix-web';
import type { StpSolidStartWeb } from '@domain-services/config-manager/resolved-types/solidstart-web';
import type { StpSvelteKitWeb } from '@domain-services/config-manager/resolved-types/sveltekit-web';
import type { StpTanStackWeb } from '@domain-services/config-manager/resolved-types/tanstack-web';
import type { StackContext } from '@domain-services/stack-context';
import type {
  CdnCachingOptions,
  CdnConfiguration,
  CdnForwardingOptions,
  CdnRouteRewrite,
  EdgeFunctionsConfig
} from '@stacktape/config/cdn';
import type { SsrWebPathCachingOverride } from '@stacktape/config/ssr-web-shared';
import { join } from 'node:path';
import { awsResourceNames } from '@stacktape/naming/aws-resource-names';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { fsPaths } from 'src/config/runtime-paths';
import { dirExists } from '@utils/fs-utils';
import { configErrors } from '../errors';
import { getNestedResourceIdentity, type DefaultedResource } from '../normalized-resource';

type SsrWebResource = StpAstroWeb | StpNuxtWeb | StpSvelteKitWeb | StpSolidStartWeb | StpTanStackWeb | StpRemixWeb;

export const validateSsrWebConfig = ({ resource, workingDir }: { resource: SsrWebResource; workingDir: string }) => {
  const appDirectory = resource.appDirectory || '.';
  const absoluteAppDirectory = join(workingDir, appDirectory);

  if (!dirExists(absoluteAppDirectory)) {
    throw configErrors.appDirectoryMissing({
      directoryPath: appDirectory,
      stpResourceName: resource.name,
      resolvedPath: absoluteAppDirectory
    });
  }
};

const normalizeCdnPath = ({ path }: { path: string }) => path.replace(/^\//, '');

/**
 * Folds a user's `cdn.pathCachingOverrides` into the route rewrites an SSR web synthesizes for itself.
 *
 * An override naming a path the framework already routes only replaces that route's caching options — its origin and
 * forwarding stay as synthesized. An override naming any other path becomes a new rewrite served by the default
 * origin, so `nextjs-web` and the six single-Lambda frameworks share one rule for what an override may and may not
 * change.
 */
export const applySsrWebPathCachingOverrides = ({
  routeRewrites,
  pathCachingOverrides,
  defaultCachingOptions,
  defaultForwardingOptions,
  defaultEdgeFunctions
}: {
  routeRewrites: CdnRouteRewrite[];
  pathCachingOverrides?: SsrWebPathCachingOverride[];
  defaultCachingOptions: CdnCachingOptions;
  defaultForwardingOptions: CdnForwardingOptions;
  defaultEdgeFunctions: EdgeFunctionsConfig;
}) => {
  if (!pathCachingOverrides?.length) {
    return routeRewrites;
  }

  const mergedRouteRewrites = routeRewrites.map((routeRewrite) => ({ ...routeRewrite }));

  pathCachingOverrides.forEach((pathOverride) => {
    const matchedRewriteIndex = mergedRouteRewrites.findIndex(
      ({ path }) => normalizeCdnPath({ path }) === normalizeCdnPath({ path: pathOverride.path })
    );

    if (matchedRewriteIndex >= 0) {
      mergedRouteRewrites[matchedRewriteIndex].cachingOptions = {
        ...(mergedRouteRewrites[matchedRewriteIndex].cachingOptions || {}),
        ...pathOverride.cachingOptions
      };
      return;
    }

    mergedRouteRewrites.push({
      path: pathOverride.path,
      forwardingOptions: defaultForwardingOptions,
      edgeFunctions: defaultEdgeFunctions,
      cachingOptions: {
        ...defaultCachingOptions,
        ...pathOverride.cachingOptions
      }
    });
  });

  return mergedRouteRewrites;
};

/** The SSR frameworks Stacktape renders as exactly one server Lambda in front of exactly one static-asset bucket. */
export type SingleLambdaSsrWebType = SsrWebResource['type'];

/**
 * The only thing the six frameworks disagree on: the build-output directory the framework writes its content-hashed
 * assets into.
 *
 * It is load-bearing three times over — as the CDN route served straight from the bucket instead of the server
 * Lambda, and as the include/exclude pair that gives those hashed files immutable cache headers while everything else
 * revalidates. Changing an entry changes which requests reach the server function, so these are framework facts, not
 * preferences. `solidstart-web` and `tanstack-web` really do share `_build`: both are Vite defaults.
 */
const HASHED_ASSET_DIRECTORY_BY_TYPE = {
  'astro-web': '_astro',
  'nuxt-web': '_nuxt',
  'sveltekit-web': '_app',
  'solidstart-web': '_build',
  'tanstack-web': '_build',
  'remix-web': 'assets'
} satisfies Record<SingleLambdaSsrWebType, string>;

/**
 * Builds the two resources one of the six single-server-Lambda SSR frameworks brings with it: the bucket its static
 * output is uploaded to, and the Lambda that renders everything else behind a CloudFront distribution.
 *
 * Everything below is shared by all six. The framework only enters through its own resource type — which names the
 * build directory and the host-header-rewrite CloudFront function — and through the hashed-asset directory read from
 * the table above.
 *
 * `nextjs-web` is deliberately not one of these. It synthesizes nine children including revalidation infrastructure,
 * image optimization and an optional edge server, and keeps its own getter.
 */
export const buildSsrWebNestedResources = ({
  ssrWeb,
  stackContext
}: {
  ssrWeb: DefaultedResource<SingleLambdaSsrWebType>;
  stackContext: StackContext;
}): { bucket: StpBucket; serverFunction: StpLambdaFunction } => {
  const {
    name,
    type: resourceType,
    configParentResourceType,
    connectTo,
    customDomains,
    environment,
    fileOptions,
    iamRoleStatements,
    serverLambda,
    cdn: customCdnConfiguration,
    useFirewall
  } = ssrWeb;

  const bucket = getNestedResourceIdentity(ssrWeb, 'bucket');
  const serverFunction = getNestedResourceIdentity(ssrWeb, 'serverFunction');
  const hashedAssetDirectory = HASHED_ASSET_DIRECTORY_BY_TYPE[resourceType];

  const serverCachingOptions: CdnCachingOptions = {
    cacheMethods: ['GET', 'HEAD', 'OPTIONS'],
    defaultTTL: 0,
    minTTL: 0,
    maxTTL: 31536000,
    cacheKeyParameters: {
      headers: { none: true },
      cookies: { none: true },
      queryString: { all: true }
    }
  };

  const serverForwardingOptions: CdnForwardingOptions = {
    allowedMethods: ['GET', 'HEAD', 'POST', 'OPTIONS', 'PATCH', 'PUT', 'DELETE'],
    originRequestPolicyId: 'b689b0a8-53d0-40ab-baf2-68738e2966ac'
  };

  const staticBucketDataForwardingOptions: CdnForwardingOptions = {
    allowedMethods: ['GET', 'HEAD', 'OPTIONS'],
    originRequestPolicyId: ref('AWS::NoValue') as unknown as string
  };

  const staticBucketDataCachingOptions: CdnCachingOptions = {
    cacheMethods: ['GET', 'HEAD', 'OPTIONS'],
    cachePolicyId: '658327ea-f89d-4fab-a63d-7e88639e58f6'
  };

  const defaultCachingOptions: CdnCachingOptions = {
    ...serverCachingOptions,
    ...(customCdnConfiguration?.defaultCachingOptions || {})
  };

  const createEdgeFunctions = (): EdgeFunctionsConfig => ({
    onRequest: getAtt(
      cfLogicalNames.ssrWebHostHeaderRewriteFunction(name, resourceType),
      'FunctionARN'
    ) as unknown as string
  });

  const buildPath = fsPaths.absoluteSsrWebBuiltProjectFolderPath({
    invocationId: stackContext.invocationId,
    stpResourceName: name,
    resourceType
  });

  const cdnConfiguration: CdnConfiguration = {
    enabled: true,
    edgeFunctions: createEdgeFunctions(),
    forwardingOptions: serverForwardingOptions,
    cachingOptions: defaultCachingOptions,
    disableInvalidationAfterDeploy: customCdnConfiguration?.disableInvalidationAfterDeploy,
    useFirewall,
    customDomains,
    routeRewrites: applySsrWebPathCachingOverrides({
      pathCachingOverrides: customCdnConfiguration?.pathCachingOverrides,
      defaultCachingOptions,
      defaultForwardingOptions: serverForwardingOptions,
      defaultEdgeFunctions: createEdgeFunctions(),
      routeRewrites: [
        {
          path: `${hashedAssetDirectory}/*`,
          forwardingOptions: staticBucketDataForwardingOptions,
          cachingOptions: staticBucketDataCachingOptions,
          routeTo: {
            type: 'bucket',
            properties: {
              bucketName: bucket.stpReferenceableName,
              disableUrlNormalization: true
            }
          }
        }
      ]
    })
  };

  return {
    bucket: {
      type: 'bucket',
      nameChain: bucket.nameChain,
      name: bucket.stpResourceName,
      configParentResourceType,
      directoryUpload: {
        directoryPath: `${buildPath}/bucket-content`,
        fileOptions: [
          ...(fileOptions || []),
          {
            includePattern: `${hashedAssetDirectory}/**/*`,
            headers: [{ key: 'cache-control', value: 'public,max-age=31536000,immutable' }]
          },
          {
            excludePattern: `${hashedAssetDirectory}/**/*`,
            includePattern: '**/*',
            headers: [{ key: 'cache-control', value: 'public,max-age=0,s-maxage=31536000,must-revalidate' }]
          }
        ]
      }
    },
    serverFunction: {
      type: 'function',
      nameChain: serverFunction.nameChain,
      name: serverFunction.stpResourceName,
      packaging: {
        type: 'custom-artifact',
        properties: {
          packagePath: `${buildPath}/server-function`,
          handler: 'index-wrap.mjs:handler'
        }
      },
      environment: [...(environment || [])],
      connectTo: [...(connectTo || [])],
      iamRoleStatements,
      handler: 'index-wrap.handler',
      artifactName: serverFunction.stpResourceName,
      resourceName: awsResourceNames.lambda(serverFunction.stpResourceName, stackContext.stackName),
      cfLogicalName: cfLogicalNames.lambda(serverFunction.stpResourceName),
      configParentResourceType,
      logging: {
        disabled: serverLambda?.logging?.disabled,
        logForwarding: serverLambda?.logging?.logForwarding,
        retentionDays: serverLambda?.logging?.retentionDays || 180
      },
      memory: serverLambda?.memory || 1024,
      joinDefaultVpc: serverLambda?.joinDefaultVpc,
      timeout: serverLambda?.timeout || 30,
      runtime: 'nodejs22.x',
      cdn: cdnConfiguration
    }
  };
};
