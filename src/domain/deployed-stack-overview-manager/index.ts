import type { ResourceDifference, TemplateDiff } from '@aws-cdk/cloudformation-diff';
import type { CloudformationResourceType } from '@cloudform/resource-types';
import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { HELPER_LAMBDA_NAMES } from '@config';
import { stackManager } from '@domain-services/cloudformation-stack-manager';
import { stpErrors } from '@errors';
import { awsResourceNames } from '@shared/naming/aws-resource-names';
import { cfLogicalNames } from '@shared/naming/logical-names';
import { stackMetadataNames } from '@shared/naming/metadata-names';
import { outputNames } from '@shared/naming/stack-output-names';
import { tagNames } from '@shared/naming/tag-names';
import { getStpNameForResource, injectedParameterEnvVarName } from '@shared/naming/utils';
import { PARENT_IDENTIFIER_SHARED_GLOBAL } from '@shared/utils/constants';
import { traverseResourcesInMap } from '@shared/utils/stack-info-map';
import compose from '@utils/basic-compose-shim';
import { cancelablePublicMethods, memoizeGetters, skipInitIfInitialized } from '@utils/decorators';
import { locallyResolveSensitiveValue } from '@utils/stack-info-map-sensitive-values';
import { capitalCase } from 'change-case';
import get from 'lodash/get';
import { pRateLimit } from 'p-ratelimit';
import { analyzeCustomResourceChange, analyzeLambdaFunctionChange, analyzeTaskDefinitionChange } from './hotswap-utils';
import { getResourceInfoLines, getResourceTypeSpecificInfoLines } from './printing-utils';

@memoizeGetters
export class DeployedStackOverviewManager {
  stackInfoMap: StackInfoMap;
  workloadsCurrentlyUsingHotSwapDeploy: string[] = [];

  init = async ({
    stackDetails,
    stackResources,
    budgetInfo
  }: {
    stackDetails: StackDetails;
    stackResources: EnrichedStackResourceInfo[];
    budgetInfo?: BudgetInfo;
  }) => {
    if (stackDetails?.stackOutput?.[outputNames.stackInfoMap()]) {
      this.stackInfoMap = await this.#getStackInfoMapOfDeployedStack({ stackDetails, budgetInfo });
      this.workloadsCurrentlyUsingHotSwapDeploy = this.#getWorkloadsCurrentlyUsingHotSwapDeploy({ stackResources });
    }
  };

  refreshStackInfoMap = async ({
    stackDetails,
    stackResources,
    budgetInfo
  }: {
    stackDetails: StackDetails;
    stackResources: EnrichedStackResourceInfo[];
    budgetInfo?: BudgetInfo;
  }) => {
    this.stackInfoMap = await this.#getStackInfoMapOfDeployedStack({ stackDetails, budgetInfo });
    this.workloadsCurrentlyUsingHotSwapDeploy = this.#getWorkloadsCurrentlyUsingHotSwapDeploy({ stackResources });
  };

  get deployedWorkloadsWithEcsTaskDefinition() {
    const workloads: { nameChain: string[]; stpResourceName: string; resource: StackInfoMapResource }[] = [];
    traverseResourcesInMap({
      stackInfoMapResources: this.stackInfoMap.resources,
      applyFn: ({ nameChain, resource, stpResourceName }) => {
        if (resource.resourceType === 'multi-container-workload') {
          workloads.push({ nameChain, resource: resource as StackInfoMapResource, stpResourceName });
        }
      }
    });
    return workloads;
  }

  get deployedFunctions() {
    const workloads: { nameChain: string[]; stpResourceName: string; resource: StackInfoMapResource }[] = [];
    traverseResourcesInMap({
      stackInfoMapResources: this.stackInfoMap.resources,
      applyFn: ({ nameChain, resource, stpResourceName }) => {
        if (resource.resourceType === 'function') {
          workloads.push({ nameChain, resource: resource as StackInfoMapResource, stpResourceName });
        }
      }
    });
    return workloads;
  }

  // getDeployedStpResourceInfo
  getStpResource = ({ nameChain }: { nameChain: string[] | string }) => {
    const chain = typeof nameChain === 'string' ? nameChain.split('.') : nameChain;
    return get(this.stackInfoMap?.resources, chain.join('._nestedResources.'));
  };

  // getReferencableParameterOfDeployedStpResource
  getStpResourceReferenceableParameter = ({
    nameChain,
    referencableParamName
  }: {
    nameChain: string[] | string;
    referencableParamName: StacktapeResourceReferenceableParam;
  }) => {
    return this.getStpResource({ nameChain })?.referencableParams[referencableParamName]?.value;
  };

  /** Track locally-injected resource names (not actually deployed to AWS) */
  #locallyInjectedResources = new Set<string>();

  /**
   * Inject local workload info into stackInfoMap for dev mode.
   * This allows $ResourceParam directives to resolve URLs for locally-running workloads.
   */
  injectLocalWorkloadInfo = (
    localWorkloads: { name: string; resourceType: string; url?: string; address?: string }[]
  ) => {
    if (!this.stackInfoMap) {
      this.stackInfoMap = { resources: {}, metadata: {} } as StackInfoMap;
    }
    for (const workload of localWorkloads) {
      const referencableParams: Record<string, { value: string }> = {};
      if (workload.url) {
        referencableParams.url = { value: workload.url };
      }
      if (workload.address) {
        referencableParams.address = { value: workload.address };
      }
      this.stackInfoMap.resources[workload.name] = {
        resourceType: workload.resourceType,
        referencableParams
      } as StackInfoMapResource;
      this.#locallyInjectedResources.add(workload.name);
    }
  };

  /** Check if a resource was locally injected (not deployed to AWS) */
  isLocallyInjectedResource = (name: string): boolean => {
    return this.#locallyInjectedResources.has(name);
  };

  /**
   * Inject local resource (database) info into stackInfoMap for dev mode.
   * This allows hooks with connectTo to resolve local database connection strings.
   */
  injectLocalResourceInfo = (
    localResources: { name: string; resourceType: string; referencableParams: Record<string, string> }[]
  ) => {
    if (!this.stackInfoMap) {
      this.stackInfoMap = { resources: {}, metadata: {} } as StackInfoMap;
    }
    for (const resource of localResources) {
      const referencableParams: Record<string, { value: string }> = {};
      for (const [key, value] of Object.entries(resource.referencableParams)) {
        referencableParams[key] = { value };
      }
      this.stackInfoMap.resources[resource.name] = {
        resourceType: resource.resourceType,
        referencableParams
      } as StackInfoMapResource;
      this.#locallyInjectedResources.add(resource.name);
    }
  };

  #getStackInfoMapOfDeployedStack = async ({
    stackDetails,
    budgetInfo
  }: {
    stackDetails: StackDetails;
    budgetInfo?: BudgetInfo;
  }) => {
    const stackData: StackInfoMap = JSON.parse(stackDetails.stackOutput[outputNames.stackInfoMap()]);
    await this.#resolveSensitiveParametersLocally(stackData);
    return {
      ...stackData,
      metadata: {
        [stackMetadataNames.name()]: { showDuringPrint: true, value: stackDetails.StackName },
        [stackMetadataNames.createdTime()]: { showDuringPrint: false, value: new Date(stackDetails.CreationTime) },
        [stackMetadataNames.lastUpdatedTime()]: {
          showDuringPrint: false,
          value: new Date(stackDetails.LastUpdatedTime)
        },
        ...(budgetInfo?.actualSpend
          ? {
              [stackMetadataNames.monthToDateSpend()]: {
                showDuringPrint: true,
                value: `${budgetInfo.actualSpend.Amount} (${budgetInfo.actualSpend.Unit})`
              }
            }
          : {}),
        ...(budgetInfo?.forecastedSpend
          ? {
              [stackMetadataNames.monthForecastedSpend()]: {
                showDuringPrint: false,
                value: `${budgetInfo.forecastedSpend.Amount}(${budgetInfo.forecastedSpend.Unit})`
              }
            }
          : {}),
        ...stackData.metadata
      }
    } as StackInfoMap;
  };

  // resolution and substitution of sensitive parameters happens in place on passed stackInfoMap
  #resolveSensitiveParametersLocally = async (stackInfoMap: StackInfoMap) => {
    const limiter = pRateLimit({
      interval: 1000, // 1s
      rate: 5 // 5 API calls per interval
    });
    const resolveSensitiveValues = async (resources: StackInfoMap['resources']) => {
      await Promise.all(
        Object.values(resources).map(async ({ referencableParams, _nestedResources }) => {
          return Promise.all([
            ...Object.values(referencableParams || {}).map(async (referencableParam) => {
              if (referencableParam.ssmParameterName) {
                const resolvedValue = await limiter(async () =>
                  locallyResolveSensitiveValue({ ssmParameterName: referencableParam.ssmParameterName })
                );

                referencableParam.value = resolvedValue;
              }
            }),
            _nestedResources ? resolveSensitiveValues(_nestedResources) : undefined
          ]);
        })
      );
    };
    return resolveSensitiveValues(stackInfoMap.resources);
  };

  #getWorkloadsCurrentlyUsingHotSwapDeploy = ({ stackResources }: { stackResources: EnrichedStackResourceInfo[] }) => {
    const workloads: string[] = [];
    traverseResourcesInMap({
      stackInfoMapResources: this.stackInfoMap.resources,
      applyFn: ({ stpResourceName, resource }) => {
        if (resource.resourceType === 'multi-container-workload') {
          Object.entries(resource.cloudformationChildResources).forEach(([cfName, { cloudformationResourceType }]) => {
            if (
              cloudformationResourceType === 'AWS::ECS::Service' ||
              cloudformationResourceType === 'Stacktape::ECSBlueGreenV1::Service'
            ) {
              const tags = stackResources.find(
                ({ LogicalResourceId }) => LogicalResourceId === cfName
              )?.ecsServiceTaskDefinitionTags;
              if (tags?.find(({ key }) => key === tagNames.hotSwapDeploy())) {
                workloads.push(stpResourceName);
              }
            }
          });
        }
        if (resource.resourceType === 'function') {
          Object.entries(resource.cloudformationChildResources).forEach(([cfName, { cloudformationResourceType }]) => {
            if (cloudformationResourceType === 'AWS::Lambda::Function') {
              const tags = stackResources.find(({ LogicalResourceId }) => LogicalResourceId === cfName)?.tags;
              if (tags?.find(({ key }) => key === tagNames.hotSwapDeploy())) {
                workloads.push(stpResourceName);
              }
            }
          });
        }
      }
    });
    return workloads;
  };

  isWorkloadCurrentlyUsingHotSwapDeploy = (stpResourceName: string) =>
    this.workloadsCurrentlyUsingHotSwapDeploy.includes(stpResourceName);

  // checks old and new template diffs and determines whether hotswap can be executed
  // this method should be called after the new Cloudformation template is fully resolved
  // otherwise you might not get correct information about diffs
  analyzeCloudformationTemplateDiff = ({ cfTemplateDiff }: { cfTemplateDiff: TemplateDiff }) => {
    let isHotswapPossible = true;
    const hotSwappableWorkloadsWhoseCodeWillBeUpdatedByCloudformation: {
      nameChain: string[];
      stpResourceName: string;
      resource: StackInfoMapResource;
    }[] = [];
    // if there are changes in these sections
    for (const sectionDiff of [
      cfTemplateDiff.conditions,
      cfTemplateDiff.mappings,
      // cfTemplateDiff.metadata,
      cfTemplateDiff.outputs,
      cfTemplateDiff.parameters
    ]) {
      for (const [logicalId, change] of Object.entries(sectionDiff.changes)) {
        if (logicalId !== outputNames.deploymentVersion()) {
          tuiManager.debug(`Non hot-swappable change detected: ${logicalId}: ${JSON.stringify(change, null, 2)}`);
          isHotswapPossible = false;
        }
      }
    }
    for (const [cfLogicalName, change] of Object.entries(cfTemplateDiff.resources.changes)) {
      const { isHotswappable, willUpdateCodeOfWorkload } = this.#analyzeResourceChange({ cfLogicalName, change });
      if (willUpdateCodeOfWorkload) {
        hotSwappableWorkloadsWhoseCodeWillBeUpdatedByCloudformation.push(willUpdateCodeOfWorkload);
      }
      if (!isHotswappable) {
        tuiManager.debug(`Non hot-swappable change detected: ${cfLogicalName}: ${JSON.stringify(change, null, 2)}`);
        isHotswapPossible = false;
      }
    }
    return { isHotswapPossible, hotSwappableWorkloadsWhoseCodeWillBeUpdatedByCloudformation };
  };

  #analyzeResourceChange = ({
    cfLogicalName,
    change
  }: {
    cfLogicalName: string;
    change: ResourceDifference;
  }): {
    isHotswappable: boolean;
    willUpdateCodeOfWorkload?: { nameChain: string[]; stpResourceName: string; resource: StackInfoMapResource };
  } => {
    if (change.isAddition || change.isRemoval) {
      return { isHotswappable: false };
    }
    if (change.resourceTypeChanged) {
      return { isHotswappable: false };
    }
    if ((change.resourceType as CloudformationResourceType) === 'AWS::ECS::TaskDefinition') {
      return analyzeTaskDefinitionChange({
        change,
        cfLogicalName,
        deployedWorkloads: this.deployedWorkloadsWithEcsTaskDefinition
      });
    }
    if ((change.resourceType as CloudformationResourceType) === 'AWS::Lambda::Function') {
      return analyzeLambdaFunctionChange({
        change,
        cfLogicalName,
        deployedWorkloads: this.deployedFunctions
      });
    }
    // some of our CustomResources (namely deployment-scripts) use "forceUpdate" property.
    // This property is different on each deploy and therefore always block hotswap.
    if ((change.resourceType as CloudformationResourceType) === 'AWS::CloudFormation::CustomResource') {
      return analyzeCustomResourceChange({
        change
      });
    }
    return { isHotswappable: false };
  };

  getStackMetadata = (propertyName: string): string | number | boolean | undefined => {
    return this.stackInfoMap?.metadata[propertyName]?.value;
  };

  resolveBastionInstanceInfo = (bastionStpName?: string) => {
    const bastionResourceStpName =
      bastionStpName ||
      Object.entries(this.stackInfoMap?.resources || {}).find(([, { resourceType }]) => {
        return resourceType === 'bastion';
      })?.[0];
    if (!bastionResourceStpName) {
      throw stpErrors.e97(null);
    }
    const deployedStpResource = this.getStpResource({ nameChain: [bastionResourceStpName] });
    if (!deployedStpResource || deployedStpResource.resourceType !== 'bastion') {
      throw stpErrors.e6({
        resourceName: bastionResourceStpName,
        resourceType: 'bastion',
        stackName: globalStateManager.targetStack.stackName
      });
    }
    const bastionInstanceId = stackManager.existingStackResources
      .find(
        ({ LogicalResourceId }) =>
          LogicalResourceId === cfLogicalNames.bastionEc2AutoscalingGroup(bastionResourceStpName)
      )
      .asgDetail.Instances.sort(
        ({ LaunchTemplate: { Version: v1 } }, { LaunchTemplate: { Version: v2 } }) => Number(v2) - Number(v1)
      )[0].InstanceId;
    return { bastionInstanceId, bastionResourceStpName };
  };

  resolveBastionTunnelsForTarget = (targetInfo: TunnelTargetInfo) => {
    const allPortForwardingTargets: ResolvedRemoteTarget[] = [];
    const targetResource = this.getStpResource({ nameChain: [targetInfo.targetStpName] });

    const { bastionInstanceId } = this.resolveBastionInstanceInfo(targetInfo.bastionStpName);
    if (targetResource?.resourceType === 'relational-database' || targetResource?.resourceType === 'redis-cluster') {
      allPortForwardingTargets.push({
        bastionInstanceId,
        remoteHost: String(targetResource.referencableParams.host.value),
        remotePort: Number(targetResource.referencableParams.port.value),
        label: 'primary',
        targetStpName: targetInfo.targetStpName,
        additionalStringToSubstitute: String(targetResource.referencableParams.connectionString.value),
        affectedReferencableParams: ['host', 'port', 'connectionString', 'jdbcConnectionString']
      });
      if (targetResource.referencableParams.readerHost) {
        allPortForwardingTargets.push({
          bastionInstanceId,
          remoteHost: String(targetResource.referencableParams.readerHost.value),
          remotePort: Number(targetResource.referencableParams.port.value),
          label: 'reader',
          targetStpName: targetInfo.targetStpName,
          additionalStringToSubstitute: String(targetResource.referencableParams.readerConnectionString.value),
          affectedReferencableParams: [
            'readerHost',
            'readerPort',
            'readerConnectionString',
            'readerJdbcConnectionString'
          ]
        });
      }
    }
    if (targetResource?.resourceType === 'relational-database') {
      if (targetResource.referencableParams.readReplicaHosts) {
        String(targetResource.referencableParams.readReplicaHosts.value)
          .split(',')
          .forEach((replicaHost, index) => {
            allPortForwardingTargets.push({
              bastionInstanceId,
              remoteHost: replicaHost,
              remotePort: Number(targetResource.referencableParams.port.value),
              targetStpName: targetInfo.targetStpName,
              label: `replica-${index}`,
              affectedReferencableParams: [
                'readReplicaConnectionStrings',
                'readReplicaHosts',
                'readReplicaJdbcConnectionStrings',
                `readReplica${index}Port`
              ]
            });
          });
      }
    }
    if (targetResource?.resourceType === 'mongo-db-atlas-cluster') {
      const [host, port] = String(targetResource.referencableParams.connectionString.value).split('/')[2].split(':');
      allPortForwardingTargets.push({
        bastionInstanceId,
        remoteHost: host,
        remotePort: Number(port) || 27017,
        label: 'primary',
        targetStpName: targetInfo.targetStpName,
        additionalStringToSubstitute: `${targetResource.referencableParams.connectionString.value}:27017`,
        affectedReferencableParams: ['connectionString']
      });
    }
    if (
      targetResource?.resourceType === 'private-service' ||
      targetResource?.resourceType === 'application-load-balancer'
    ) {
      const host = String(targetResource.referencableParams.domain.value);
      const allExposedPorts = new Set(
        ((targetResource.outputs || {}) as StacktapeResourceOutput<'application-load-balancer'>).integrations.map(
          ({ listenerPort }) => listenerPort
        )
      );
      allExposedPorts.forEach((portNum) => {
        allPortForwardingTargets.push({
          bastionInstanceId,
          remoteHost: host,
          remotePort: Number(portNum),
          label: `port-${portNum}`,
          targetStpName: targetInfo.targetStpName,
          affectedReferencableParams: ['domain', 'url', `port${portNum}`]
        });
      });
    }
    return allPortForwardingTargets;
  };

  locallyResolveEnvVariablesFromConnectTo = (connectTo: string[]): Record<string, any> => {
    const envVars: Record<string, any> = {};
    (connectTo || []).forEach((stpResourceName) => {
      const deployedResourceInfo = this.getStpResource({ nameChain: [stpResourceName] });
      // console.log(JSON.stringify(deployedResourceInfo, null, 2));
      if (deployedResourceInfo) {
        Object.entries(deployedResourceInfo.referencableParams || {}).forEach(([paramName, { value }]) => {
          envVars[injectedParameterEnvVarName(stpResourceName, paramName)] = value;
        });
      }
    });
    return envVars;
  };

  getIamRoleNameOfDeployedResource = (nameChain: string[] | string) => {
    const {
      targetStack: { stackName },
      region
    } = globalStateManager;
    const nameChainSplit = typeof nameChain === 'string' ? nameChain.split('.') : nameChain;
    const resource = this.getStpResource({ nameChain });
    if (!resource) {
      throw stpErrors.e77({ resourceName: nameChainSplit.join('.'), stackName });
    }
    const parentResource = this.getStpResource({
      nameChain: nameChainSplit[0]
    });

    if (resource.resourceType === 'function') {
      return awsResourceNames.lambdaRole(
        stackName,
        region,
        getStpNameForResource({
          nameChain: nameChainSplit,
          parentResourceType: parentResource.resourceType as StpResourceType
        }),
        parentResource.resourceType as StpLambdaFunction['configParentResourceType']
      );
    }
    if (resource.resourceType === 'batch-job') {
      return awsResourceNames.batchJobRole(stackName, region, getStpNameForResource({ nameChain: nameChainSplit }));
    }
    if (
      resource.resourceType === 'worker-service' ||
      resource.resourceType === 'web-service' ||
      resource.resourceType === 'private-service' ||
      resource.resourceType === 'multi-container-workload'
    ) {
      return awsResourceNames.containerWorkloadRole(
        stackName,
        region,
        getStpNameForResource({ nameChain: nameChainSplit })
      );
    }
    if (resource.resourceType === 'nextjs-web') {
      return awsResourceNames.lambdaRole(
        stackName,
        region,
        getStpNameForResource({
          nameChain: [...nameChainSplit, 'serverFunction'],
          parentResourceType: parentResource.resourceType as StpResourceType
        }),
        parentResource.resourceType as StpLambdaFunction['configParentResourceType']
      );
    }
    throw stpErrors.e122({
      stpResourceName: nameChainSplit.join('.'),
      stpResourceType: resource.resourceType as StpResourceType
    });
  };

  printResourceInfo = (nameChain: string[]) => {
    const { links, referencableParams, resourceType, outputs } = this.getStpResource({
      nameChain
    });
    tuiManager.info(
      getResourceInfoLines({
        nameChain,
        resourceType,
        links,
        referencableParams,
        outputs,
        showSensitiveValues: false
      }).lines.join('\n')
    );
  };

  printShortStackInfo = () => {
    if (tuiManager.enabled) return;
    const { resources } = this.stackInfoMap;
    const linesToPrint = [`Deployment complete. Stage: ${globalStateManager.targetStack.stage}. Overview:\n`];

    for (const resourceName in resources) {
      const resource = resources[resourceName];
      if (
        [
          'http-api-gateway',
          'bucket',
          'application-load-balancer',
          'network-load-balancer',
          'web-service',
          'hosting-bucket',
          'function',
          'nextjs-web'
        ].includes(resource.resourceType)
      ) {
        const urlParams = [
          resource.referencableParams.cdnCustomDomainUrls,
          resource.referencableParams.cdnUrl,
          resource.referencableParams.customDomainUrls,
          resource.referencableParams.url
        ];
        const url = urlParams.filter(Boolean)[0]?.value;
        const domainParams = [
          resource.referencableParams.cdnCustomDomains,
          resource.referencableParams.cdnDomain,
          resource.referencableParams.customDomains,
          resource.referencableParams.domain
        ];
        const domain = domainParams.filter(Boolean)[0]?.value;
        if (url) {
          linesToPrint.push(
            `  ${tuiManager.makeBold(resourceName)} URL: ${tuiManager.colorize('green', url.toString())}`
          );
          linesToPrint.push(...getResourceTypeSpecificInfoLines(resource));
        } else if (domain) {
          linesToPrint.push(
            `  ${tuiManager.makeBold(resourceName)} Domain: ${tuiManager.colorize('green', domain.toString())}`
          );
        }
        const canonicalDomainParams = [
          resource.referencableParams.cdnCanonicalDomain,
          resource.referencableParams.canonicalDomain
        ];
        const canonicalDomain = canonicalDomainParams.filter((param) => param?.showDuringPrint)[0]?.value;
        if (canonicalDomain) {
          linesToPrint.push(
            `  ${tuiManager.makeBold(resourceName)} Canonical Domain: ${tuiManager.colorize('green', canonicalDomain.toString())}`
          );
        }
      }
    }
    // /projects/posts-api-starter/dev2/overview
    linesToPrint.push(
      `\nMore details: ${tuiManager.makeBold(
        `https://console.stacktape.com/projects/${globalStateManager.targetStack.projectName}/${globalStateManager.targetStack.stage}/overview`
      )}\n`
    );
    tuiManager.info(linesToPrint.join('\n'));
  };

  /**
   * Get resource links for TUI summary display
   */
  getResourceLinks = (): { label: string; url: string }[] => {
    const { resources } = this.stackInfoMap;
    const links: { label: string; url: string }[] = [];

    for (const resourceName in resources) {
      const resource = resources[resourceName];
      if (
        [
          'http-api-gateway',
          'bucket',
          'application-load-balancer',
          'network-load-balancer',
          'web-service',
          'hosting-bucket',
          'function',
          'nextjs-web'
        ].includes(resource.resourceType)
      ) {
        const urlParams = [
          resource.referencableParams.cdnCustomDomainUrls,
          resource.referencableParams.cdnUrl,
          resource.referencableParams.customDomainUrls,
          resource.referencableParams.url
        ];
        const url = urlParams.filter(Boolean)[0]?.value;
        if (url) {
          links.push({ label: `${resourceName} URL`, url: url.toString() });
        }
      }
    }

    return links;
  };

  printEntireStackInfo = () => {
    const {
      resources,
      customOutputs,
      metadata: { name: metaStackName, createdTime: metaCreated, lastUpdatedTime: metaLastUpdated, ...restMeta }
    } = this.stackInfoMap;

    const linesToPrint = [
      'Stack overview:',
      `${tuiManager.colorize('yellow', 'Stack name')}: ${metaStackName.value}`,
      `${tuiManager.colorize('yellow', 'Created time')}: ${metaCreated.value.toLocaleString()}`,
      `${tuiManager.colorize('yellow', 'Last updated time')}: ${metaLastUpdated.value.toLocaleString()}.`
    ];
    let containsSensitiveValues = false;
    Object.entries(restMeta)
      .filter(([, { showDuringPrint }]) => showDuringPrint)
      .forEach(([metaName, { value }]) => {
        linesToPrint.push(`${tuiManager.colorize('yellow', capitalCase(metaName))}: ${value}`);
      });

    const filteredResourcesToPrint = Object.entries(resources)
      // filter out shared global outputs and links
      .filter(([stpResourceName]) => {
        return (
          stpResourceName !== PARENT_IDENTIFIER_SHARED_GLOBAL &&
          !HELPER_LAMBDA_NAMES.includes(stpResourceName as HelperLambdaName)
        );
      })
      // filter out all resources which do not contain any links or referencable params which we want to show
      .filter(
        ([, { links, referencableParams }]) =>
          Object.keys(links).length ||
          Object.entries(referencableParams).filter(([, { showDuringPrint }]) => showDuringPrint).length
      )
      .map(([stpResourceName, resource]) => ({ nameChain: [stpResourceName], ...resource }));

    filteredResourcesToPrint.forEach(({ nameChain, links, referencableParams, resourceType, outputs }) => {
      const { lines, containsSensitiveValues: sensVals } = getResourceInfoLines({
        nameChain,
        resourceType,
        links,
        referencableParams,
        outputs,
        showSensitiveValues: false
      });
      containsSensitiveValues = sensVals || containsSensitiveValues;
      linesToPrint.push(...lines);
    });
    // dealing with user defined outputs
    const userDefinedOutputs = Object.entries(customOutputs);
    if (userDefinedOutputs.length) {
      linesToPrint.push(tuiManager.colorize('magenta', 'Custom outputs'));
      userDefinedOutputs.forEach(([descriptiveName, value], index, arr) =>
        linesToPrint.push(
          `  ${arr.length - 1 === index ? '└' : '├'} ${tuiManager.colorize('green', `${descriptiveName}`)}: ${value}`
        )
      );
    }
    tuiManager.info(linesToPrint.join('\n'));
    return { containsSensitiveValues };
  };
}

export const deployedStackOverviewManager = compose(
  skipInitIfInitialized,
  cancelablePublicMethods
)(new DeployedStackOverviewManager());
