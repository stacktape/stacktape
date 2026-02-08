import type { CloudformationResourceType } from '@cloudform/resource-types';
import { eventManager } from '@application-services/event-manager';
import { globalStateManager } from '@application-services/global-state-manager';
import { configManager } from '@domain-services/config-manager';
import { templateManager } from '@domain-services/template-manager';
import { consoleLinks } from '@shared/naming/console-links';
import { stackMetadataNames } from '@shared/naming/metadata-names';
import { buildSSMParameterNameForReferencableParam } from '@shared/naming/ssm-secret-parameters';
import { PARENT_IDENTIFIER_CUSTOM_CF, PARENT_IDENTIFIER_SHARED_GLOBAL } from '@shared/utils/constants';
import { serialize } from '@shared/utils/misc';
import { getCloudformationChildResources } from '@shared/utils/stack-info-map';
import compose from '@utils/basic-compose-shim';
import { transformIntoCloudformationSubstitutedString } from '@utils/cloudformation';
import { cancelablePublicMethods, skipInitIfInitialized } from '@utils/decorators';
import { UnexpectedError } from '@utils/errors';
import { kebabCase } from 'change-case';
import get from 'lodash/get';
import { resolveApplicationLoadBalancers } from './resource-resolvers/application-load-balancers';
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
import { resolveCustomResources } from './resource-resolvers/custom-resources';
import { resolveDatabases } from './resource-resolvers/databases';
import { resolveDeploymentScripts } from './resource-resolvers/deployment-scripts';
import { resolveDynamoTables } from './resource-resolvers/dynamo-db-tables';
import { resolveEdgeLambdaFunctions } from './resource-resolvers/edge-lambda-functions';
import { resolveEfsFilesystems } from './resource-resolvers/efs-filesystems';
import { resolveEventBuses } from './resource-resolvers/event-buses';
import { resolveFunctions } from './resource-resolvers/functions';
import { resolveHostingBuckets } from './resource-resolvers/hosting-buckets';
import { resolveHttpApiGateways } from './resource-resolvers/http-api-gateways';
import { resolveKinesisStreams } from './resource-resolvers/kinesis-streams';
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
import { resolveUserPools } from './resource-resolvers/user-pools';
import { resolveWebAppFirewalls } from './resource-resolvers/web-app-firewalls';
import { resolveWebServices } from './resource-resolvers/web-services';
import { resolveWorkerServices } from './resource-resolvers/worker-services';

export class CalculatedStackOverviewManager {
  stackInfoMap: StackInfoMap = { metadata: {}, resources: {}, customOutputs: {} };

  init = async () => {};

  reset = () => {
    this.stackInfoMap = { metadata: {}, resources: {}, customOutputs: {} };
  };

  resolveAllResources = async () => {
    await eventManager.startEvent({
      eventType: 'RESOLVE_CONFIG',
      description: 'Resolving configuration',
      phase: 'INITIALIZE'
    });
    await Promise.all([
      resolveStackOutputs(),
      resolveCustomResources(),
      resolveDeploymentBucket(),
      resolveImageRepository(),
      resolveApplicationLoadBalancers(),
      resolveBatchJobs(),
      resolveNetworkLoadBalancers(),
      resolveBuckets(),
      resolveContainerWorkloads(),
      resolveAwsVpcDeployment(),
      resolveDefaultEdgeLambdas(),
      resolveDefaultEdgeLambdaBucket(),
      resolveStacktapeServiceLambda(),
      resolveFunctions(),
      resolveS3EventsCustomResource(),
      resolveSensitiveDataCustomResource(),
      resolveAcceptVpcPeeringCustomResource(),
      resolveDefaultDomainCertCustomResource(),
      resolveDatabases(),
      resolveDynamoTables(),
      resolveOpenSearchDomains(),
      resolveEventBuses(),
      resolveBastions(),
      resolveCloudformationResources(),
      resolveStateMachines(),
      resolveHttpApiGateways(),
      resolveUserPools(),
      resolveAtlasMongoClusters(),
      resolveServiceDiscoveryPrivateNamespace(),
      resolveRedisClusters(),
      resolveUpstashRedisDatabases(),
      resolveEdgeLambdaFunctions(),
      resolveBudget(),
      resolveCodeDeploySharedResources(),
      resolveWebServices(),
      resolveAwsCdkConstructs(),
      resolvePrivateServices(),
      resolveWorkerServices(),
      resolveSqsQueues(),
      resolveSnsTopics(),
      resolveKinesisStreams(),
      resolveHostingBuckets(),
      resolveWebAppFirewalls(),
      resolveDeploymentScripts(),
      resolveNextjsWebs(),
      resolveAstroWebs(),
      resolveNuxtWebs(),
      resolveSvelteKitWebs(),
      resolveSolidStartWebs(),
      resolveTanStackWebs(),
      resolveRemixWebs(),
      resolveEfsFilesystems(),
      resolveDevAgentRole(),
      resolveDebugAgentRole(),
      resolveDevContainerWorkloadRoles()
    ]);
    await eventManager.finishEvent({ eventType: 'RESOLVE_CONFIG', phase: 'INITIALIZE' });
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
    resource: CloudformationResource;
    nameChain: string[] | string;
    initial?: boolean;
  }) => {
    const parentResource = this.#ensureMapResource({ nameChain });
    if (parentResource.cloudformationChildResources[cfLogicalName]) {
      throw new UnexpectedError({
        customMessage: `Error when resolving. Child resource with cloudformation logical name "${cfLogicalName}" for parent "${nameChain}" is already in resource map.`
      });
    }
    parentResource.cloudformationChildResources[cfLogicalName] = {
      cloudformationResourceType: resource.Type as CloudformationResourceType
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
            stackName: globalStateManager.targetStack.stackName,
            region: globalStateManager.region
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

  getSubstitutedStackInfoMap = async (): Promise<IntrinsicFunction> => {
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
      metaValue: consoleLinks.stackUrl(
        globalStateManager.region,
        globalStateManager.targetStack.stackName,
        'resources'
      ),
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
