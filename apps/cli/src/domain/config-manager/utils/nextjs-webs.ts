import type { StpLambdaFunction } from '@domain-services/config-manager/resolved-types/functions';
import type { StpNextjsWeb } from '@domain-services/config-manager/resolved-types/nextjs-web';
import type { StackContext } from '@domain-services/stack-context';
import type { CdnCachingOptions, CdnConfiguration, CdnForwardingOptions } from '@stacktape/config/cdn';
import type { CustomArtifactLambdaPackaging } from '@stacktape/config/deployment-artifacts';
import { join } from 'node:path';
import { GetAtt, Ref } from '@cloudform/functions';
import {
  getLambdaLogResourceArnsForPermissions,
  getLogGroupPolicyDocumentStatements
} from '@domain-services/calculated-stack-overview-manager/resource-resolvers/_utils/role-helpers';
import { awsResourceNames } from '@stacktape/naming/aws-resource-names';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { fsPaths } from 'src/config/runtime-paths';
import { dirExists, isFileAccessible } from '@utils/fs-utils';
import { configErrors } from '../errors';
import { getNestedResourceIdentity, type DefaultedResource } from '../normalized-resource';
import { applySsrWebPathCachingOverrides } from './ssr-webs';

export const validateNextjsWebConfig = ({ resource, workingDir }: { resource: StpNextjsWeb; workingDir: string }) => {
  const absoluteAppDirectory = join(workingDir, resource.appDirectory);
  if (!dirExists(absoluteAppDirectory)) {
    throw configErrors.appDirectoryMissing({
      directoryPath: resource.appDirectory,
      stpResourceName: resource.name,
      resolvedPath: absoluteAppDirectory
    });
  }
  if (
    !isFileAccessible(join(absoluteAppDirectory, 'next.config.js')) &&
    !isFileAccessible(join(absoluteAppDirectory, 'next.config.ts'))
  ) {
    throw configErrors.nextjsProjectMissing({
      directoryPath: resource.appDirectory,
      stpResourceName: resource.name
    });
  }
  if (resource.streamingEnabled && resource.useEdgeLambda) {
    throw configErrors.nextjsEdgeStreamingConflict({ stpResourceName: resource.name });
  }
  if (resource.serverLambda?.joinDefaultVpc && resource.useEdgeLambda) {
    throw configErrors.nextjsEdgeVpcConflict({ stpResourceName: resource.name });
  }
};

/**
 * Builds the nine resources a Next.js web brings with it.
 *
 * Next.js is deliberately not one of the frameworks `buildSsrWebNestedResources` covers. OpenNext splits one
 * build into several artifacts, and each becomes its own Stacktape resource: the bucket the static output and the ISR
 * cache live in, the server bundle, an image optimizer, and the revalidation queue, table, consumer and seeder. Three
 * of the nine are conditional — the server runs either in a regular Lambda or as a replicated edge function, and a
 * Lambda-served site may additionally keep warm instances.
 */
export const buildNextjsWebNestedResources = ({
  nextjsWeb,
  stackContext
}: {
  nextjsWeb: DefaultedResource<'nextjs-web'>;
  stackContext: StackContext;
}): StpNextjsWeb['_nestedResources'] => {
  // Every child gets an identity whether or not this configuration ends up synthesizing it: whether the server
  // runs at the edge, or a warmer is wanted, decides which resources are created, not how they are named.
  const nestedResourceInfo = {
    bucket: getNestedResourceIdentity(nextjsWeb, 'bucket'),
    imageFunction: getNestedResourceIdentity(nextjsWeb, 'imageFunction'),
    revalidationFunction: getNestedResourceIdentity(nextjsWeb, 'revalidationFunction'),
    revalidationQueue: getNestedResourceIdentity(nextjsWeb, 'revalidationQueue'),
    revalidationTable: getNestedResourceIdentity(nextjsWeb, 'revalidationTable'),
    revalidationInsertFunction: getNestedResourceIdentity(nextjsWeb, 'revalidationInsertFunction'),
    serverEdgeFunction: getNestedResourceIdentity(nextjsWeb, 'serverEdgeFunction'),
    serverFunction: getNestedResourceIdentity(nextjsWeb, 'serverFunction'),
    warmerFunction: getNestedResourceIdentity(nextjsWeb, 'warmerFunction')
  };

  const {
    name,
    configParentResourceType,
    type: _t,
    connectTo,
    customDomains,
    environment,
    fileOptions,
    iamRoleStatements,
    appDirectory: _a,
    buildCommand: _b,
    dev: _dev,
    serverLambda,
    useEdgeLambda,
    useFirewall,
    nameChain: _p,
    warmServerInstances,
    cdn: customCdnConfiguration,
    overrides: _overrides,
    streamingEnabled,
    ...restProps
  } = nextjsWeb;
  // eslint-disable-next-line
  const propsCheck: Record<string, never> = restProps;

  const serverCachingOptions: CdnCachingOptions = {
    cacheMethods: ['GET', 'HEAD', 'OPTIONS'],
    defaultTTL: 0,
    minTTL: 0,
    maxTTL: 31536000,
    cacheKeyParameters: {
      headers: {
        whitelist: ['next-url', 'rsc', 'next-router-prefetch', 'next-router-state-tree', 'accept']
      },
      cookies: {
        none: true
      },
      queryString: {
        all: true
      }
    }
  };
  const imageLambdaCachingOptions: CdnCachingOptions = {
    cacheMethods: ['GET', 'HEAD', 'OPTIONS'],
    defaultTTL: 0,
    minTTL: 0,
    maxTTL: 31536000,
    cacheKeyParameters: {
      headers: {
        none: true
      },
      cookies: {
        none: true
      },
      queryString: {
        all: true
      }
    }
  };
  const serverForwardingOptions: CdnForwardingOptions = {
    allowedMethods: ['GET', 'HEAD', 'POST', 'OPTIONS', 'PATCH', 'PUT', 'DELETE'],
    originRequestPolicyId: 'b689b0a8-53d0-40ab-baf2-68738e2966ac'
  };
  const imageLambdaForwardingOptions: CdnForwardingOptions = {
    allowedMethods: ['GET', 'HEAD', 'POST', 'OPTIONS', 'PATCH', 'PUT', 'DELETE'],
    originRequestPolicyId: Ref('AWS::NoValue') as unknown as string
  };

  const staticBucketDataForwardingOptions: CdnForwardingOptions = {
    allowedMethods: ['GET', 'HEAD', 'OPTIONS'],
    originRequestPolicyId: Ref('AWS::NoValue') as unknown as string
  };

  const staticBucketDataCachingOptions: CdnCachingOptions = {
    cacheMethods: ['GET', 'HEAD', 'OPTIONS'],
    cachePolicyId: '658327ea-f89d-4fab-a63d-7e88639e58f6'
  };

  const openNextBuildPath = fsPaths.absoluteNextjsBuiltProjectFolderPath({
    invocationId: stackContext.invocationId,
    stpResourceName: name
  });

  const cdnConfiguration: CdnConfiguration = {
    enabled: true,
    edgeFunctions: {
      onRequest: GetAtt(cfLogicalNames.openNextHostHeaderRewriteFunction(name), 'FunctionARN') as unknown as string,
      onOriginRequest: useEdgeLambda && nestedResourceInfo.serverEdgeFunction.stpReferenceableName
    },
    forwardingOptions: serverForwardingOptions,
    cachingOptions: {
      ...serverCachingOptions,
      ...(customCdnConfiguration?.defaultCachingOptions || {})
    },
    disableInvalidationAfterDeploy: customCdnConfiguration?.disableInvalidationAfterDeploy,
    useFirewall,
    customDomains,
    routeRewrites: applySsrWebPathCachingOverrides({
      pathCachingOverrides: customCdnConfiguration?.pathCachingOverrides,
      defaultCachingOptions: {
        ...serverCachingOptions,
        ...(customCdnConfiguration?.defaultCachingOptions || {})
      },
      defaultForwardingOptions: serverForwardingOptions,
      defaultEdgeFunctions: {
        onRequest: GetAtt(cfLogicalNames.openNextHostHeaderRewriteFunction(name), 'FunctionARN') as unknown as string,
        onOriginRequest: useEdgeLambda && nestedResourceInfo.serverEdgeFunction.stpReferenceableName
      },
      routeRewrites: [
        {
          path: 'api/*',
          edgeFunctions: {
            onRequest: GetAtt(
              cfLogicalNames.openNextHostHeaderRewriteFunction(name),
              'FunctionARN'
            ) as unknown as string,
            onOriginRequest: useEdgeLambda && nestedResourceInfo.serverEdgeFunction.stpReferenceableName
          },
          forwardingOptions: serverForwardingOptions,
          cachingOptions: serverCachingOptions
        },
        {
          path: '_next/data/*',
          edgeFunctions: {
            onRequest: GetAtt(
              cfLogicalNames.openNextHostHeaderRewriteFunction(name),
              'FunctionARN'
            ) as unknown as string,
            onOriginRequest: useEdgeLambda && nestedResourceInfo.serverEdgeFunction.stpReferenceableName
          },
          forwardingOptions: serverForwardingOptions,
          cachingOptions: serverCachingOptions
        },
        {
          path: '_next/image*',
          forwardingOptions: imageLambdaForwardingOptions,
          cachingOptions: imageLambdaCachingOptions,
          routeTo: {
            type: 'function',
            properties: {
              functionName: nestedResourceInfo.imageFunction.stpReferenceableName
            }
          }
        },
        // this is cache behaviour for all static content
        // however the path patterns are only known later on (after packaging) and therefore this route rewrite is modified using template override
        {
          path: '<<TBD_STATIC>>',
          forwardingOptions: staticBucketDataForwardingOptions,
          cachingOptions: staticBucketDataCachingOptions,
          routePrefix: '/_assets',
          routeTo: {
            type: 'bucket',
            properties: {
              bucketName: nestedResourceInfo.bucket.stpReferenceableName,
              disableUrlNormalization: true
            }
          }
        }
        // {
        //   path: '_next/*',
        //   forwardingOptions: staticBucketDataForwardingOptions,
        //   cachingOptions: staticBucketDataCachingOptions,
        //   routePrefix: '/_assets',
        //   routeTo: {
        //     type: 'bucket',
        //     properties: {
        //       bucketName: nestedResourceInfo.bucket.stpReferenceableName,
        //       disableUrlNormalization: true
        //     }
        //   }
        // }
        // maybe this will better be done with template override (in resolver)
        // ...(existsSync(`${appDirectory}/public`) ? readdirSync(`${appDirectory}/public`) : []).map((path) => ({
        //   path,
        //   forwardingOptions: staticBucketDataForwardingOptions,
        //   cachingOptions: staticBucketDataCachingOptions,
        //   routePrefix: '/_assets',
        //   routeTo: !useEdgeLambda
        //     ? ({
        //         type: 'bucket',
        //         properties: {
        //           bucketName: nestedResourceInfo.bucket.stpReferenceableName
        //         }
        //       } as CdnBucketRoute)
        //     : undefined
        // }))
      ]
    })
  };

  // The two children carrying a legacy field are bound here rather than written straight into the returned record:
  // inline, each would be checked against the resolved type alone, which does not admit that field. Bound, the
  // intersection beside each one is what checks it, and everything else in the record stays strictly checked.
  const serverFunction = !useEdgeLambda
    ? ({
        type: 'function',
        nameChain: nestedResourceInfo.serverFunction.nameChain,
        name: nestedResourceInfo.serverFunction.stpResourceName,
        packaging: {
          type: 'custom-artifact',
          properties: {
            packagePath: `${openNextBuildPath}/server-function`,
            handler: 'index.mjs:handler'
          }
        },
        environment: [
          ...(environment || []),
          {
            name: 'CACHE_BUCKET_NAME',
            value: Ref(cfLogicalNames.bucket(nestedResourceInfo.bucket.stpResourceName)) as unknown as string
          },
          {
            name: 'CACHE_BUCKET_PREFIX',
            value: '_cache'
          },
          {
            name: 'CACHE_BUCKET_REGION',
            value: stackContext.region
          },
          {
            name: 'REVALIDATION_QUEUE_URL',
            value: Ref(
              cfLogicalNames.sqsQueue(nestedResourceInfo.revalidationQueue.stpResourceName)
            ) as unknown as string
          },
          {
            name: 'REVALIDATION_QUEUE_REGION',
            value: stackContext.region
          },
          {
            name: 'CACHE_DYNAMO_TABLE',
            value: Ref(
              cfLogicalNames.dynamoGlobalTable(nestedResourceInfo.revalidationTable.stpResourceName)
            ) as unknown as string
          }
        ],
        connectTo: [
          ...(connectTo || []),
          nestedResourceInfo.bucket.stpReferenceableName,
          nestedResourceInfo.revalidationQueue.stpReferenceableName,
          nestedResourceInfo.revalidationTable.stpReferenceableName
        ],
        iamRoleStatements,
        handler: 'index-wrap.handler',
        artifactName: nestedResourceInfo.serverFunction.stpResourceName,
        resourceName: awsResourceNames.lambda(
          nestedResourceInfo.serverFunction.stpResourceName,
          stackContext.stackName
        ),
        cfLogicalName: cfLogicalNames.lambda(nestedResourceInfo.serverFunction.stpResourceName),
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
        cdn: cdnConfiguration,
        // `responseStreamingEnabled` is not part of a resolved Lambda: nothing reads it, and streaming is actually
        // decided by the packaging step from the parent's `streamingEnabled`. It is emitted here as it always has
        // been — dropping it would be a behavior change rather than a move.
        responseStreamingEnabled: streamingEnabled
      } satisfies StpLambdaFunction & { responseStreamingEnabled?: boolean })
    : undefined;

  const imageFunctionPackaging = {
    type: 'custom-artifact',
    properties: {
      packagePath: `${openNextBuildPath}/image-optimization-function`,
      handler: 'index.mjs:handler'
    },
    // The architecture belongs on the function, not on its packaging — the stack resolver reads
    // `lambdaProps.architecture` — so this entry does not currently reach CloudFormation. It is kept where it is
    // because moving it would change the deployed image optimizer from x86_64 to arm64.
    architecture: 'arm64'
  } satisfies CustomArtifactLambdaPackaging & { architecture: 'arm64' };

  return {
    bucket: {
      type: 'bucket',
      nameChain: nestedResourceInfo.bucket.nameChain,
      name: nestedResourceInfo.bucket.stpResourceName,
      configParentResourceType,
      cdn: useEdgeLambda ? { ...cdnConfiguration, disableUrlNormalization: true } : undefined,
      // directory to upload must be created during packaging process
      directoryUpload: {
        directoryPath: `${openNextBuildPath}/bucket-content`,
        fileOptions: [
          ...(fileOptions || []),
          {
            includePattern: '_assets/_next/**/*',
            headers: [{ key: 'cache-control', value: 'public,max-age=31536000,immutable' }]
          },
          {
            excludePattern: '_assets/_next/**/*',
            includePattern: '_assets/**/*',
            headers: [{ key: 'cache-control', value: 'public,max-age=0,s-maxage=31536000,must-revalidate' }]
          }
        ]
      }
    },
    serverFunction,
    serverEdgeFunction: useEdgeLambda
      ? {
          type: 'edge-lambda-function',
          nameChain: nestedResourceInfo.serverEdgeFunction.nameChain,
          name: nestedResourceInfo.serverEdgeFunction.stpResourceName,
          packaging: {
            type: 'custom-artifact',
            properties: {
              packagePath: `${openNextBuildPath}/server-function`,
              handler: 'index.mjs:handler'
            }
          },
          // todo: do not forget to create template override (asset modifier resource for this)
          // environment: [...environment, ...(serverLambda?.environment || [])],
          connectTo: [
            ...(connectTo || []),
            nestedResourceInfo.bucket.stpReferenceableName,
            nestedResourceInfo.revalidationQueue.stpReferenceableName,
            nestedResourceInfo.revalidationTable.stpReferenceableName
          ],
          iamRoleStatements: [
            ...(iamRoleStatements || []),
            ...getLogGroupPolicyDocumentStatements(
              getLambdaLogResourceArnsForPermissions({
                lambdaResourceName: awsResourceNames.edgeLambda(
                  nestedResourceInfo.serverEdgeFunction.stpResourceName,
                  stackContext.stackName,
                  stackContext.region
                ),
                edgeLambda: true
              }),
              false
            )
          ],
          handler: 'index-wrap.handler',
          artifactName: nestedResourceInfo.serverEdgeFunction.stpResourceName,
          resourceName: awsResourceNames.edgeLambda(
            nestedResourceInfo.serverEdgeFunction.stpResourceName,
            stackContext.stackName,
            stackContext.region
          ),
          configParentResourceType,
          logging: {
            disabled: serverLambda?.logging?.disabled,
            logForwarding: serverLambda?.logging?.logForwarding,
            retentionDays: serverLambda?.logging?.retentionDays || 180
          },
          memory: serverLambda?.memory || 1024,
          timeout: serverLambda?.timeout || 30,
          runtime: 'nodejs22.x'
        }
      : undefined,
    imageFunction: {
      type: 'function',
      nameChain: nestedResourceInfo.imageFunction.nameChain,
      name: nestedResourceInfo.imageFunction.stpResourceName,
      packaging: imageFunctionPackaging,
      environment: [
        {
          name: 'BUCKET_NAME',
          value: Ref(cfLogicalNames.bucket(nestedResourceInfo.bucket.stpResourceName)) as unknown as string
        },
        {
          name: 'BUCKET_KEY_PREFIX',
          value: '_assets'
        }
      ],
      connectTo: [nestedResourceInfo.bucket.stpReferenceableName],
      handler: 'index.handler',
      artifactName: nestedResourceInfo.imageFunction.stpResourceName,
      resourceName: awsResourceNames.lambda(nestedResourceInfo.imageFunction.stpResourceName, stackContext.stackName),
      cfLogicalName: cfLogicalNames.lambda(nestedResourceInfo.imageFunction.stpResourceName),
      configParentResourceType,
      logging: {
        disabled: serverLambda?.logging?.disabled,
        logForwarding: serverLambda?.logging?.logForwarding,
        retentionDays: serverLambda?.logging?.retentionDays || 180
      },
      memory: 2048,
      timeout: 30,
      runtime: 'nodejs22.x'
    },
    revalidationFunction: {
      type: 'function',
      nameChain: nestedResourceInfo.revalidationFunction.nameChain,
      name: nestedResourceInfo.revalidationFunction.stpResourceName,
      packaging: {
        type: 'custom-artifact',
        properties: {
          packagePath: `${openNextBuildPath}/revalidation-function`,
          handler: 'index.mjs:handler'
        }
      },
      handler: 'index.handler',
      artifactName: nestedResourceInfo.revalidationFunction.stpResourceName,
      resourceName: awsResourceNames.lambda(
        nestedResourceInfo.revalidationFunction.stpResourceName,
        stackContext.stackName
      ),
      cfLogicalName: cfLogicalNames.lambda(nestedResourceInfo.revalidationFunction.stpResourceName),
      configParentResourceType,
      logging: {
        disabled: serverLambda?.logging?.disabled,
        logForwarding: serverLambda?.logging?.logForwarding,
        retentionDays: serverLambda?.logging?.retentionDays || 3
      },
      memory: 128,
      timeout: 30,
      runtime: 'nodejs22.x',
      events: [
        {
          type: 'sqs',
          properties: { sqsQueueName: nestedResourceInfo.revalidationQueue.stpReferenceableName, batchSize: 5 }
        }
      ]
    },
    revalidationQueue: {
      type: 'sqs-queue',
      nameChain: nestedResourceInfo.revalidationQueue.nameChain,
      name: nestedResourceInfo.revalidationQueue.stpResourceName,
      configParentResourceType,
      fifoEnabled: true,
      longPollingSeconds: 20
    },
    revalidationTable: {
      type: 'dynamo-db-table',
      nameChain: nestedResourceInfo.revalidationTable.nameChain,
      name: nestedResourceInfo.revalidationTable.stpResourceName,
      configParentResourceType,
      primaryKey: {
        partitionKey: {
          name: 'tag',
          type: 'string'
        },
        sortKey: {
          name: 'path',
          type: 'string'
        }
      },
      enablePointInTimeRecovery: true,
      secondaryIndexes: [
        {
          name: 'revalidate',
          partitionKey: { name: 'path', type: 'string' },
          sortKey: { name: 'revalidatedAt', type: 'number' }
        }
      ]
    },
    revalidationInsertFunction: {
      type: 'function',
      nameChain: nestedResourceInfo.revalidationInsertFunction.nameChain,
      name: nestedResourceInfo.revalidationInsertFunction.stpResourceName,
      packaging: {
        type: 'custom-artifact',
        properties: {
          packagePath: `${openNextBuildPath}/dynamodb-provider`,
          handler: 'index.mjs:handler'
        }
      },
      handler: 'index-wrap.handler',
      artifactName: nestedResourceInfo.revalidationInsertFunction.stpResourceName,
      resourceName: awsResourceNames.lambda(
        nestedResourceInfo.revalidationInsertFunction.stpResourceName,
        stackContext.stackName
      ),
      cfLogicalName: cfLogicalNames.lambda(nestedResourceInfo.revalidationInsertFunction.stpResourceName),
      configParentResourceType,
      environment: [
        {
          name: 'CACHE_DYNAMO_TABLE',
          value: Ref(
            cfLogicalNames.dynamoGlobalTable(nestedResourceInfo.revalidationTable.stpResourceName)
          ) as unknown as string
        }
      ],
      logging: {
        disabled: serverLambda?.logging?.disabled,
        logForwarding: serverLambda?.logging?.logForwarding,
        retentionDays: serverLambda?.logging?.retentionDays || 3
      },
      memory: 1024,
      timeout: 900,
      runtime: 'nodejs22.x',
      connectTo: [nestedResourceInfo.revalidationTable.stpReferenceableName]
    },
    warmerFunction:
      !useEdgeLambda && warmServerInstances
        ? {
            type: 'function',
            nameChain: nestedResourceInfo.warmerFunction.nameChain,
            name: nestedResourceInfo.warmerFunction.stpResourceName,
            packaging: {
              type: 'custom-artifact',
              properties: {
                packagePath: `${openNextBuildPath}/warmer-function`,
                handler: 'index.mjs:handler'
              }
            },
            environment: [
              {
                name: 'FUNCTION_NAME',
                value: Ref(
                  cfLogicalNames.lambda(nestedResourceInfo.serverFunction.stpResourceName)
                ) as unknown as string
              },
              {
                name: 'CONCURRENCY',
                value: warmServerInstances
              }
            ],
            handler: 'index.handler',
            runtime: 'nodejs22.x',
            artifactName: nestedResourceInfo.warmerFunction.stpResourceName,
            resourceName: awsResourceNames.lambda(
              nestedResourceInfo.warmerFunction.stpResourceName,
              stackContext.stackName
            ),
            cfLogicalName: cfLogicalNames.lambda(nestedResourceInfo.warmerFunction.stpResourceName),
            configParentResourceType,
            logging: {
              disabled: serverLambda?.logging?.disabled,
              logForwarding: serverLambda?.logging?.logForwarding,
              retentionDays: serverLambda?.logging?.retentionDays || 3
            },
            connectTo: [nestedResourceInfo.serverFunction.stpReferenceableName],
            memory: 1024,
            events: [
              {
                type: 'schedule',
                properties: {
                  scheduleRate: 'rate(5 minutes)'
                }
              }
            ]
          }
        : undefined
  };
};
