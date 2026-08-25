import type { Intrinsic } from '@stacktape/cloudformation/intrinsics';
import type { AnyCloudFormationResource } from '@stacktape/cloudformation/resource';
import type { KnownCloudFormationResourceType } from '@stacktape/cloudformation/resource';
import type { StackInfoMapResource } from '@domain-services/stack-info/types';
import type { OutputValue, StackInfoMap, StacktapeResourceOutput } from '@domain-services/stack-info/types';
import type {
  StacktapeResourceReferenceableParam,
  StpResource,
  StpResourceType
} from '@domain-services/config-manager/resolved-types/resources';
import { eventManager } from '@application-services/event-manager';
import { configManager } from '@domain-services/config-manager';
import { getEmailSenderBindingsFingerprint } from '@domain-services/email-sender-manager/bindings-fingerprint';
import { templateManager } from '@domain-services/template-manager';
import { consoleLinks } from '@stacktape/naming/console-links';
import { stackMetadataNames } from '@stacktape/naming/stack-metadata-names';
import { buildSSMParameterNameForReferencableParam } from '@stacktape/naming/ssm-parameter-paths';
import { PARENT_IDENTIFIER_CUSTOM_CF, PARENT_IDENTIFIER_SHARED_GLOBAL } from 'src/config/constants';
import { serialize } from '@utils/misc';
import { getCloudformationChildResources } from '@utils/stack-info-map';
import compose from '@utils/basic-compose-shim';
import { transformIntoCloudformationSubstitutedString } from '@utils/cloudformation';
import { cancelablePublicMethods, skipInitIfInitialized } from '@utils/decorators';
import { kebabCase } from 'change-case';
import get from 'lodash/get';
import { resolveAgentCoreResources } from './resource-resolvers/agentcore';
import { resolveApplicationLoadBalancers } from './resource-resolvers/application-load-balancers';
import { resolveAppSyncApis } from './resource-resolvers/appsync-apis';
import { resolveAwsCdkConstructs } from './resource-resolvers/aws-cdk-construct';
import { resolveAcceptVpcPeeringCustomResource } from './resource-resolvers/background-resources/accept-vpc-peerings-custom-resource';
import { resolveCodeDeploySharedResources } from './resource-resolvers/background-resources/code-deploy';
import { resolveDefaultDomainCertCustomResource } from './resource-resolvers/background-resources/default-domain-cert-custom-resource';
import { resolveDeploymentBucket } from './resource-resolvers/background-resources/deployment-bucket';
import { resolveDebugAgentRole } from './resource-resolvers/background-resources/debug-agent-role';
import { resolveDevAgentRole } from './resource-resolvers/background-resources/dev-agent-role';
import { resolveImageRepository } from './resource-resolvers/background-resources/deployment-image-repository';
import { resolveS3EventsCustomResource } from './resource-resolvers/background-resources/s3-events-custom-resource';
import { resolveSensitiveDataCustomResource } from './resource-resolvers/background-resources/sensitive-data-custom-resource';
import { resolveServiceDiscoveryPrivateNamespace } from './resource-resolvers/background-resources/service-discovery';
import {
  resolveDefaultEdgeLambdaBucket,
  resolveDefaultEdgeLambdas
} from './resource-resolvers/background-resources/shared-edge-lambdas-custom-resource';
import { resolveStacktapeServiceLambda } from './resource-resolvers/background-resources/stacktape-service-lambda';
import { resolveAwsVpcDeployment } from './resource-resolvers/background-resources/vpc';
import { resolveBastions } from './resource-resolvers/bastion';
import { resolveBatchJobs } from './resource-resolvers/batch-jobs';
import { resolveBuckets } from './resource-resolvers/buckets';
import { resolveBudget } from './resource-resolvers/budget';
import { resolveCloudformationResources } from './resource-resolvers/cloudformation-resources';
import { resolveConvexes } from './resource-resolvers/convex';
import { resolveCustomResources } from './resource-resolvers/custom-resources';
import { resolveDatabases } from './resource-resolvers/databases';
import { resolveDeploymentScripts } from './resource-resolvers/deployment-scripts';
import { resolveDynamoTables } from './resource-resolvers/dynamo-db-tables';
import { resolveDsqlDatabases } from './resource-resolvers/dsql-databases';
import { resolveEmailSenders } from './resource-resolvers/email-senders';
import { resolveEdgeLambdaFunctions } from './resource-resolvers/edge-lambda-functions';
import { resolveEfsFilesystems } from './resource-resolvers/efs-filesystems';
import { resolveEventBuses } from './resource-resolvers/event-buses';
import { resolveFunctions } from './resource-resolvers/functions';
import { resolveHostingBuckets } from './resource-resolvers/hosting-buckets';
import { resolveHttpApiGateways } from './resource-resolvers/http-api-gateways';
import { resolveWebsocketApiGateways } from './resource-resolvers/websocket-api-gateways';
import { resolveKinesisStreams } from './resource-resolvers/kinesis-streams';
import { resolveKafkaClusters } from './resource-resolvers/kafka-clusters';
import { resolveAtlasMongoClusters } from './resource-resolvers/mongo-db-atlas-clusters';
import { resolveContainerWorkloads } from './resource-resolvers/multi-container-workloads';
import { resolveDevContainerWorkloadRoles } from './resource-resolvers/multi-container-workloads/dev-roles';
import { resolveNetworkLoadBalancers } from './resource-resolvers/network-load-balancers';
import { resolveNextjsWebs } from './resource-resolvers/nextjs-web';
import {
  resolveAstroWebs,
  resolveNuxtWebs,
  resolveSvelteKitWebs,
  resolveSolidStartWebs,
  resolveTanStackWebs,
  resolveRemixWebs
} from './resource-resolvers/ssr-web';
import { resolveOpenSearchDomains } from './resource-resolvers/open-search';
import { resolveStackOutputs } from './resource-resolvers/outputs';
import { resolvePrivateServices } from './resource-resolvers/private-services';
import { resolveRedisClusters } from './resource-resolvers/redis-clusters';
import { resolveSnsTopics } from './resource-resolvers/sns-topics';
import { resolveSqsQueues } from './resource-resolvers/sqs-queues';
import { resolveStateMachines } from './resource-resolvers/state-machines';
import { resolveUpstashRedisDatabases } from './resource-resolvers/upstash-redis';
import { resolveUptimeChecks } from './resource-resolvers/uptime-checks';
import { resolveUserPools } from './resource-resolvers/user-pools';
import { resolveWebAppFirewalls } from './resource-resolvers/web-app-firewalls';
import { resolveWebServices } from './resource-resolvers/web-services';
import { resolveWorkerServices } from './resource-resolvers/worker-services';
import type { StackContext } from '@domain-services/stack-context';
import { getSharedResourceStackName } from '@stacktape/naming/shared-stacks';

/** Starts resolvers in order, waits for every one that started, then propagates the first observed failure. */
export const settleResourceResolvers = async (
  resourceResolvers: ReadonlyArray<() => unknown | PromiseLike<unknown>>
) => {
  let firstFailure: { reason: unknown } | undefined;
  const startedResolvers: Promise<void>[] = [];
  for (const resolveResource of resourceResolvers) {
    try {
      const resolverPromise = Promise.resolve(resolveResource());
      startedResolvers.push(
        resolverPromise.then(
          () => undefined,
          (reason) => {
            firstFailure ??= { reason };
          }
        )
      );
    } catch (reason) {
      // The previous call shape also stopped invoking later resolvers after a synchronous failure. Work already started
      // above is still observed and settled before the error escapes.
      firstFailure ??= { reason };
      break;
    }
  }
  await Promise.all(startedResolvers);
  if (firstFailure) {
    throw firstFailure.reason;
  }
};

export class CalculatedStackOverviewManager {
  stackInfoMap: StackInfoMap = { metadata: {}, resources: {}, customOutputs: {} };
  #context: StackContext | undefined;

  get context(): StackContext {
    if (!this.#context) {
      throw new Error('Calculated stack overview manager was used before its synthesis context was initialized.');
    }
    return this.#context;
  }

  init = async ({ context }: { context: StackContext }) => {
    this.#context = Object.freeze({ ...context });
  };

  reset = () => {
    this.stackInfoMap = { metadata: {}, resources: {}, customOutputs: {} };
    this.#context = undefined;
  };

  resolveAllResources = async () => {
    void this.context;
    // No phase pin: this runs at different points per command (after packaging
    // during deploy), and pinning it to INITIALIZE would file the event under a
    // phase that already closed in the scrollback record.
    await eventManager.startEvent({
      eventType: 'RESOLVE_CONFIG',
      description: 'Preparing infrastructure template'
    });
    await settleResourceResolvers([
      resolveStackOutputs,
      resolveCustomResources,
      resolveDeploymentBucket,
      resolveImageRepository,
      resolveApplicationLoadBalancers,
      resolveAppSyncApis,
      resolveBatchJobs,
      resolveNetworkLoadBalancers,
      resolveBuckets,
      resolveContainerWorkloads,
      resolveAwsVpcDeployment,
      resolveDefaultEdgeLambdas,
      resolveDefaultEdgeLambdaBucket,
      resolveStacktapeServiceLambda,
      resolveFunctions,
      resolveAgentCoreResources,
      resolveS3EventsCustomResource,
      resolveSensitiveDataCustomResource,
      resolveAcceptVpcPeeringCustomResource,
      resolveDefaultDomainCertCustomResource,
      resolveDatabases,
      resolveDynamoTables,
      resolveDsqlDatabases,
      resolveEmailSenders,
      resolveOpenSearchDomains,
      resolveEventBuses,
      resolveBastions,
      resolveCloudformationResources,
      resolveStateMachines,
      resolveHttpApiGateways,
      resolveWebsocketApiGateways,
      resolveUserPools,
      resolveAtlasMongoClusters,
      resolveServiceDiscoveryPrivateNamespace,
      resolveRedisClusters,
      resolveUpstashRedisDatabases,
      resolveUptimeChecks,
      resolveEdgeLambdaFunctions,
      resolveBudget,
      resolveCodeDeploySharedResources,
      resolveWebServices,
      resolveAwsCdkConstructs,
      resolvePrivateServices,
      resolveWorkerServices,
      resolveSqsQueues,
      resolveSnsTopics,
      resolveKinesisStreams,
      resolveKafkaClusters,
      resolveHostingBuckets,
      resolveWebAppFirewalls,
      resolveDeploymentScripts,
      resolveNextjsWebs,
      resolveAstroWebs,
      resolveNuxtWebs,
      resolveSvelteKitWebs,
      resolveSolidStartWebs,
      resolveTanStackWebs,
      resolveRemixWebs,
      resolveEfsFilesystems,
      () => resolveConvexes({ context: this.context }),
      resolveDevAgentRole,
      resolveDebugAgentRole,
      resolveDevContainerWorkloadRoles
    ]);
    await eventManager.finishEvent({
      eventType: 'RESOLVE_CONFIG',
      finalMessage: `Infrastructure template prepared (${this.resourceCount} AWS resources)`
    });
  };

  get resourceCount() {
    return Object.values(this.stackInfoMap.resources)
      .flat()
      .map(({ cloudformationChildResources }) => Object.keys(cloudformationChildResources).length)
      .reduce((a, b) => a + b, 0);
  }

  getStpResource = ({ nameChain }: { nameChain: string[] | string }) => {
    const chain = typeof nameChain === 'string' ? nameChain.split('.') : nameChain;
    return get(this.stackInfoMap.resources, chain.join('._nestedResources.'));
  };

  #ensureMapResource = ({ nameChain }: { nameChain: string[] | string }) => {
    const chain = typeof nameChain === 'string' ? nameChain.split('.') : nameChain;
    if (!this.stackInfoMap.resources[chain[0]]) {
      this.stackInfoMap.resources[chain[0]] = this.#getEmptyMapResource({ topLevelParent: chain[0] });
    }
    return get(this.stackInfoMap.resources, chain.join('._nestedResources.'));
  };

  #getEmptyMapResource = ({ topLevelParent }: { topLevelParent: string }) => {
    const getMapResource = (resource: {
      type: StpResourceType | 'SHARED_GLOBAL' | 'CUSTOM_CLOUDFORMATION';
      _nestedResources?: StpResource['_nestedResources'];
    }): StackInfoMapResource => {
      return {
        resourceType: resource.type,
        cloudformationChildResources: {},
        referencableParams: {},
        links: {},
        outputs: {},
        _nestedResources:
          resource._nestedResources &&
          Object.entries(resource._nestedResources).reduce((acc, [nestedResourceIdentifier, nestedResource]) => {
            if (nestedResource) {
              acc[nestedResourceIdentifier] = getMapResource(nestedResource);
            }
            return acc;
          }, {})
      };
    };
    if (topLevelParent === PARENT_IDENTIFIER_SHARED_GLOBAL || topLevelParent === PARENT_IDENTIFIER_CUSTOM_CF) {
      return getMapResource({
        type: topLevelParent,
        _nestedResources:
          topLevelParent === PARENT_IDENTIFIER_SHARED_GLOBAL ? configManager.sharedGlobalNestedResources : undefined
      });
    }
    return getMapResource(configManager.findResourceInConfig({ nameChain: topLevelParent }).resource);
  };

  addUserCustomStackOutput = ({
    cloudformationOutputName,
    value,
    exportOutput,
    description
  }: {
    cloudformationOutputName: string;
    value: OutputValue;
    exportOutput?: boolean;
    description?: string;
  }) => {
    this.stackInfoMap.customOutputs[cloudformationOutputName] = value;
    templateManager.addStackOutput({ cfOutputName: cloudformationOutputName, value, exportOutput, description });
  };

  addCfChildResource = ({
    cfLogicalName,
    nameChain,
    resource,
    initial
  }: {
    cfLogicalName: string;
    resource: AnyCloudFormationResource;
    nameChain: string[] | string;
    initial?: boolean;
  }) => {
    const parentResource = this.#ensureMapResource({ nameChain });
    if (parentResource.cloudformationChildResources[cfLogicalName]) {
      throw new Error(
        `Error when resolving. Child resource with cloudformation logical name "${cfLogicalName}" for parent "${nameChain}" is already in resource map.`
      );
    }
    parentResource.cloudformationChildResources[cfLogicalName] = {
      cloudformationResourceType: resource.Type as KnownCloudFormationResourceType
    };
    templateManager.addResource({ cfLogicalName, resource, initial });
  };

  addStacktapeResourceLink = ({
    nameChain,
    linkValue,
    linkName
  }: {
    nameChain: string[];
    linkName: string;
    linkValue: OutputValue;
  }) => {
    const parentResource = this.#ensureMapResource({ nameChain });
    parentResource.links[kebabCase(linkName)] = linkValue;
  };

  addStackMetadata = ({
    metaName,
    metaValue,
    showDuringPrint
  }: {
    metaName: string;
    metaValue: OutputValue;
    showDuringPrint?: boolean;
  }) => {
    this.stackInfoMap.metadata[metaName] = {
      showDuringPrint: showDuringPrint !== false,
      value: metaValue
    };
  };

  addStacktapeResourceReferenceableParam = ({
    nameChain,
    paramName,
    paramValue,
    showDuringPrint,
    sensitive
  }: {
    nameChain: string[];
    paramName: StacktapeResourceReferenceableParam;
    paramValue: OutputValue;
    showDuringPrint?: boolean;
    sensitive?: boolean;
  }) => {
    const parentResource = this.#ensureMapResource({ nameChain });

    parentResource.referencableParams[paramName] = {
      showDuringPrint: showDuringPrint !== false,
      value: paramValue,
      ssmParameterName: sensitive
        ? buildSSMParameterNameForReferencableParam({
            nameChain,
            paramName,
            stackName: this.context.stackName,
            region: this.context.region
          })
        : undefined
    };
  };

  addStacktapeResourceOutput = <T extends StpResourceType>({
    nameChain,
    output
  }: {
    nameChain: string[];
    output: Partial<StacktapeResourceOutput<T>>;
  }) => {
    const parentResource = this.#ensureMapResource({ nameChain });
    parentResource.outputs = {
      ...parentResource.outputs,
      ...output
    };
  };

  getSubstitutedStackInfoMap = async (): Promise<Intrinsic> => {
    const substituteSensitiveValues = (resources: StackInfoMap['resources']): StackInfoMap['resources'] => {
      const resultResourceMap: StackInfoMap['resources'] = {};
      Object.entries(serialize(resources) as StackInfoMap['resources']).forEach(
        ([
          stpResourceName,
          { links, referencableParams, resourceType, cloudformationChildResources, outputs, _nestedResources }
        ]) => {
          resultResourceMap[stpResourceName] = {
            resourceType,
            referencableParams,
            links,
            cloudformationChildResources,
            outputs,
            _nestedResources: _nestedResources && substituteSensitiveValues(_nestedResources)
          } as StackInfoMapResource;
          // replacing sensitive values with placeholder
          Object.entries(resultResourceMap[stpResourceName].referencableParams).forEach(
            ([paramName, { ssmParameterName }]) => {
              if (ssmParameterName) {
                resultResourceMap[stpResourceName].referencableParams[paramName].value = '<<OMITTED>>';
              }
            }
          );
        }
      );
      return resultResourceMap;
    };

    // passing in the copy of this.stackInfoMap.resources to avoid overwriting sensitive values
    const substitutedResourcesMap = substituteSensitiveValues(serialize(this.stackInfoMap.resources));

    // resolving directives (including runtime)
    // we need to resolve them now in order to substitute nested cloudformation functions in the next step
    const resultObject: StackInfoMap = await configManager.resolveDirectives<StackInfoMap>({
      itemToResolve: {
        metadata: serialize(this.stackInfoMap.metadata),
        resources: substitutedResourcesMap,
        customOutputs: serialize(this.stackInfoMap.customOutputs)
      },
      resolveRuntime: true,
      useLocalResolve: false
    });
    // creating substituted object for Cloudformation to process
    return transformIntoCloudformationSubstitutedString(resultObject);
  };

  populateStackMetadata = async () => {
    this.addStackMetadata({
      metaName: stackMetadataNames.stackConsole(),
      metaValue: consoleLinks.stackUrl(this.context.region, this.context.stackName, 'resources'),
      showDuringPrint: true
    });

    this.addStackMetadata({
      metaName: stackMetadataNames.imageCount(),
      metaValue: `${configManager.allImagesCount}`,
      showDuringPrint: false
    });
    this.addStackMetadata({
      metaName: stackMetadataNames.functionCount(),
      metaValue: `${configManager.allLambdaResourcesCount}`,
      showDuringPrint: false
    });
    if (configManager.deploymentConfig?.cloudformationRoleArn) {
      this.addStackMetadata({
        metaName: stackMetadataNames.cloudformationRoleArn(),
        metaValue: configManager.deploymentConfig.cloudformationRoleArn,
        showDuringPrint: false
      });
    }

    // Store rollback safety metadata for future rollback operations
    const rollbackSafety = configManager.getRollbackSafetyInfo();
    this.addStackMetadata({
      metaName: stackMetadataNames.rollbackSafety(),
      metaValue: JSON.stringify(rollbackSafety),
      showDuringPrint: false
    });
    this.addStackMetadata({
      metaName: stackMetadataNames.emailSenderBindingsFingerprint(),
      metaValue: getEmailSenderBindingsFingerprint({
        resources: configManager.allResourcesIncludingNested,
        senders: configManager.emailSenders
      }),
      showDuringPrint: false
    });
    const retainedSharedResources = configManager.emailSenders
      .filter(({ manageIdentity }) => manageIdentity !== false)
      .map(({ identity }) => ({
        kind: 'email-identity' as const,
        identity,
        stackName: getSharedResourceStackName('email-identity', identity)
      }));
    if (retainedSharedResources.length) {
      this.addStackMetadata({
        metaName: stackMetadataNames.retainedSharedResources(),
        metaValue: JSON.stringify(retainedSharedResources),
        showDuringPrint: false
      });
    }
  };

  isCfResourceChildOfStpResource = ({
    stpResourceName,
    cfLogicalName
  }: {
    stpResourceName: string;
    cfLogicalName: string;
  }) => {
    return !!this.getChildResourceList({ stpResourceName })[cfLogicalName];
  };

  getChildResourceList = ({ stpResourceName }: { stpResourceName: string }) => {
    return getCloudformationChildResources({ resource: this.getStpResource({ nameChain: stpResourceName }) });
  };

  findStpParentNameOfCfResource = ({ cfLogicalName }: { cfLogicalName: string }) => {
    return Object.keys(this.stackInfoMap.resources).find((stpResourceName) =>
      this.isCfResourceChildOfStpResource({
        stpResourceName,
        cfLogicalName
      })
    );
  };
}

export const calculatedStackOverviewManager = compose(
  skipInitIfInitialized,
  cancelablePublicMethods
)(new CalculatedStackOverviewManager());
