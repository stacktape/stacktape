import { join } from 'node:path';
import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import {
  lambdaRuntimesForFileExtension,
  linksMap,
  supportedAwsCdkConstructExtensions,
  supportedWorkloadExtensions
} from '@config';
import { stpErrors } from '@errors';
import { isDirAccessible, isFileAccessible } from '@shared/utils/fs-utils';
import { capitalizeFirstLetter, getUniqueDuplicates, isAlphanumeric } from '@shared/utils/misc';
import { ExpectedError } from '@utils/errors';
import { parseUserCodeFilepath } from '@utils/user-code-processing';
import { configManager } from '../index';
import { validateApplicationLoadBalancerConfig } from './application-load-balancers';
import { resolveReferenceToBastion } from './bastion';
import { validateBucketConfig, validateHostingBucketConfig } from './buckets';
import { validateHttpApiGatewayConfig } from './http-api-gateways';
import { validateLambdaConfig } from './lambdas';
import { validateMultiContainerWorkloadConfig } from './multi-container-workloads';
import { validateNetworkLoadBalancerConfig } from './network-load-balancers';
import { validateNextjsWebConfig } from './nextjs-webs';
import { validateSsrWebConfig } from './ssr-webs';
import { validateRelationalDatabaseConfig } from './relational-databases';
import { validateSnsTopicConfig } from './sns-topics';
import { validateSqsQueueConfig } from './sqs-queues';
import { validateWebServiceConfig } from './web-services';
import { validateConfigWithZod } from './zod-validator';

export const validatePackagingProps = ({
  packaging,
  workloadName,
  containerName,
  lambdaRuntime,
  workloadType
}: {
  packaging: AllSupportedPackagingConfig;
  workloadName: string;
  containerName?: string;
  lambdaRuntime?: LambdaRuntime;
  workloadType: StpWorkloadType;
}) => {
  const prettyIdentifier = `${capitalizeFirstLetter(workloadType)} ${tuiManager.makeBold(workloadName)}${
    containerName && workloadType === 'multi-container-workload'
      ? ` (container ${tuiManager.makeBold(containerName)})`
      : ''
  }`;
  const cwdHint = `The path is resolved relative to the directory specified using ${tuiManager.prettyOption(
    'currentWorkingDirectory'
  )} or the directory containing Stacktape configuration file.`;
  if (packaging.type === 'stacktape-image-buildpack' || packaging.type === 'stacktape-lambda-buildpack') {
    const { entryfilePath } = packaging.properties;
    const { extension, filePath, handler, hasExplicitHandler } = parseUserCodeFilepath({
      codeType: `${prettyIdentifier} entryfilePath`,
      fullPath: entryfilePath,
      workingDir: globalStateManager.workingDir
    });
    if (!supportedWorkloadExtensions.includes(extension as SupportedFileExt)) {
      const issue: string = {
        java: linksMap.javaWorkloadIssue,
        py: linksMap.pythonWorkloadIssue,
        cs: linksMap.csharpWorkloadIssue,
        rb: linksMap.rubyWorkloadIssue,
        go: linksMap.goWorkloadIssue
      }[extension];
      if (!issue) {
        throw new ExpectedError('PACKAGING_CONFIG', `${prettyIdentifier} has unsupported file extension ${extension}`);
      }
      throw new ExpectedError(
        'NOT_YET_IMPLEMENTED',
        `Packaging .${extension} compute resources is not yet supported.`,
        issue
      );
    }

    if (filePath && workloadType === 'function') {
      const allowedRuntimes = lambdaRuntimesForFileExtension[extension];
      if (!allowedRuntimes) {
        throw new ExpectedError(
          'PACKAGING_CONFIG',
          `${prettyIdentifier} has unsupported entryfile extension ${extension} for file ${tuiManager.prettyFilePath(
            filePath
          )}`
        );
      }
      if (lambdaRuntime && !allowedRuntimes.includes(lambdaRuntime)) {
        throw new ExpectedError(
          'PACKAGING_CONFIG',
          `${prettyIdentifier} has unsupported runtime ${lambdaRuntime} for entryfile with extension .${extension}`
        );
      }
    }
    if (!isFileAccessible(filePath)) {
      throw new ExpectedError(
        'PACKAGING_CONFIG',
        `${prettyIdentifier}'s entryfilePath ${filePath} doesn't exist or is not accessible.`,
        cwdHint
      );
    }
    if (extension === 'py') {
      validateStacktapeBuildpackPythonPackagingProps({
        packaging,
        workloadName,
        workloadType,
        hasAppVariableSpecified: hasExplicitHandler,
        appVariable: handler
      });
    }
  } else if (packaging.type === 'custom-dockerfile') {
    const { dockerfilePath, buildContextPath } = packaging.properties;
    const fullLocation = buildContextPath
      ? join(globalStateManager.workingDir, buildContextPath, dockerfilePath || 'Dockerfile')
      : join(globalStateManager.workingDir, dockerfilePath || 'Dockerfile');
    if (!isFileAccessible(fullLocation)) {
      throw new ExpectedError(
        'PACKAGING_CONFIG',
        `${prettyIdentifier}'s dockerfilePath ${tuiManager.prettyFilePath(
          fullLocation
        )} doesn't exist or is not accessible.`,
        cwdHint
      );
    }
  } else if (packaging.type === 'custom-artifact') {
    const { packagePath } = packaging.properties;
    const fullLocation = join(globalStateManager.workingDir, packagePath);
    if (!isFileAccessible(fullLocation) && !isDirAccessible(fullLocation)) {
      throw new ExpectedError(
        'PACKAGING_CONFIG',
        `${prettyIdentifier}'s packagePath ${tuiManager.prettyFilePath(fullLocation)} doesn't exist or is not accessible.`,
        cwdHint
      );
    }
  } else if (packaging.type === 'external-buildpack') {
    const { sourceDirectoryPath } = packaging.properties;
    const fullLocation = join(globalStateManager.workingDir, sourceDirectoryPath);
    if (!isFileAccessible(fullLocation) && !isDirAccessible(fullLocation)) {
      throw new ExpectedError(
        'PACKAGING_CONFIG',
        `${prettyIdentifier}'s sourceDirectoryPath ${tuiManager.prettyFilePath(
          fullLocation
        )} doesn't exist or is not accessible.`,
        cwdHint
      );
    }
  }
  // @todo validate prebuilt-image?
};

const validateStacktapeBuildpackPythonPackagingProps = ({
  packaging,
  workloadName,
  hasAppVariableSpecified,
  appVariable,
  workloadType
}: {
  packaging: StpBuildpackCwImagePackaging | StpBuildpackBjImagePackaging | StpBuildpackLambdaPackaging;
  workloadName: string;
  hasAppVariableSpecified: boolean;
  appVariable?: string;
  workloadType: StpWorkloadType;
}) => {
  const languageSpecificConfig: PyLanguageSpecificConfig = packaging.properties
    .languageSpecificConfig as PyLanguageSpecificConfig;
  if (packaging.type === 'stacktape-lambda-buildpack' && languageSpecificConfig?.runAppAs) {
    throw stpErrors.e1002({ workloadName, workloadType });
  }
  if (!hasAppVariableSpecified && languageSpecificConfig?.runAppAs) {
    throw stpErrors.e1001({ entryfilePath: packaging.properties.entryfilePath, workloadName, workloadType });
  }
  if (hasAppVariableSpecified && !languageSpecificConfig?.runAppAs) {
    throw stpErrors.e91({ workloadName, workloadType, appVariable });
  }
};

export const validateAwsCdkConstructProps = ({ construct }: { construct: StpAwsCdkConstruct }) => {
  const prettyIdentifier = `${capitalizeFirstLetter('aws-cdk-construct')} ${tuiManager.makeBold(construct.name)}`;
  const cwdHint = `The path is resolved relative to the directory specified using ${tuiManager.prettyOption(
    'currentWorkingDirectory'
  )} or the directory containing Stacktape configuration file.`;

  const { entryfilePath } = construct;
  const { extension, filePath } = parseUserCodeFilepath({
    codeType: `${prettyIdentifier} entryfilePath`,
    fullPath: entryfilePath,
    workingDir: globalStateManager.workingDir
  });
  if (!supportedAwsCdkConstructExtensions.includes(extension as SupportedFileExt)) {
    throw new ExpectedError(
      'NOT_YET_IMPLEMENTED',
      `Packaging ${tuiManager.makeBold(`.${extension}`)} constructs is not yet supported.`
    );
  }
  if (!isFileAccessible(filePath)) {
    throw new ExpectedError(
      'CONFIG',
      `${prettyIdentifier}'s entryfilePath ${filePath} doesn't exist or is not accessible.`,
      cwdHint
    );
  }
};

export const validateConfigStructure = async ({
  config,
  configPath,
  templateId
}: {
  config: StacktapeConfig;
  configPath: string;
  templateId: string;
}) => {
  // Use Zod validator for better error messages (especially for discriminated unions)
  const zodResult = validateConfigWithZod({ config, configPath, templateId });
  if (!zodResult.valid && 'errorMessage' in zodResult) {
    throw new ExpectedError('CONFIG_VALIDATION', zodResult.errorMessage);
  }
};

export const validateResourceNameUniqueness = () => {
  const resourceNames = configManager.allConfigResources.map(({ name }) => name);
  const duplicates = getUniqueDuplicates(resourceNames);
  if (duplicates.length) {
    throw new ExpectedError(
      'CONFIG_VALIDATION',
      `Workload names must be unique across whole service. Duplicates: ${duplicates.join(', ')}.`
    );
  }
};

export const validateResourceNames = () => {
  configManager.allConfigResources.forEach(({ name }) => {
    if (!isAlphanumeric(name)) {
      throw new ExpectedError(
        'CONFIG_VALIDATION',
        `Resource name "${name}" is not valid. Each resource name must be alphanumeric.`
      );
    }
  });
};

export const validateGuardrails = ({
  guardrails,
  hasConfig
}: {
  guardrails: GuardrailDefinition[];
  hasConfig: boolean;
}) => {
  for (const guardrail of guardrails || []) {
    switch (guardrail.type) {
      case 'stage-restriction': {
        const { allowedStages } = guardrail.properties;
        if (allowedStages?.length && !allowedStages.includes(globalStateManager.targetStack.stage)) {
          throw new ExpectedError(
            'GUARDRAIL',
            `Stage "${globalStateManager.targetStack.stage}" is not allowed. Allowed stages: ${allowedStages.join(', ')}.`
          );
        }
        break;
      }
      case 'region-restriction': {
        const { allowedRegions } = guardrail.properties;
        if (allowedRegions?.length && !allowedRegions.includes(globalStateManager.region)) {
          throw new ExpectedError(
            'GUARDRAIL',
            `Region "${globalStateManager.region}" is not allowed. Allowed regions: ${allowedRegions.join(', ')}.`
          );
        }
        break;
      }
      case 'command-restriction': {
        const { blockedCommands } = guardrail.properties;
        if (blockedCommands?.length && blockedCommands.includes(globalStateManager.command)) {
          throw new ExpectedError(
            'GUARDRAIL',
            `Command "${globalStateManager.command}" is blocked by organization guardrails. Blocked commands: ${blockedCommands.join(', ')}.`
          );
        }
        break;
      }
      case 'resource-type-restriction': {
        if (!hasConfig) break;
        const { blockedResourceTypes } = guardrail.properties;
        if (!blockedResourceTypes?.length) break;
        for (const resource of configManager.allConfigResources) {
          if (blockedResourceTypes.includes(resource.type)) {
            throw new ExpectedError(
              'GUARDRAIL',
              `Resource "${resource.name}" uses type "${resource.type}" which is blocked. Blocked resource types: ${blockedResourceTypes.join(', ')}.`
            );
          }
        }
        break;
      }
      case 'require-vpc-databases': {
        if (!hasConfig || !guardrail.properties.enabled) break;
        const vpcOnlyModes = ['vpc', 'scoping-workloads-in-vpc'];
        for (const db of configManager.databases) {
          const accessibilityMode = (db as StpRelationalDatabase).accessibility?.accessibilityMode || 'internet';
          if (!vpcOnlyModes.includes(accessibilityMode)) {
            throw new ExpectedError(
              'GUARDRAIL',
              `Database "${db.name}" has accessibility mode "${accessibilityMode}". All databases must use VPC-only accessibility (vpc or scoping-workloads-in-vpc).`
            );
          }
        }
        for (const os of configManager.openSearchDomains) {
          const accessibilityMode = (os as StpOpenSearchDomain).accessibility?.accessibilityMode || 'internet';
          if (!vpcOnlyModes.includes(accessibilityMode)) {
            throw new ExpectedError(
              'GUARDRAIL',
              `OpenSearch domain "${os.name}" has accessibility mode "${accessibilityMode}". All databases must use VPC-only accessibility (vpc or scoping-workloads-in-vpc).`
            );
          }
        }
        break;
      }
      case 'require-deletion-protection': {
        if (!hasConfig || !guardrail.properties.enabled) break;
        for (const db of configManager.databases) {
          if (!(db as StpRelationalDatabase).deletionProtection) {
            throw new ExpectedError(
              'GUARDRAIL',
              `Database "${db.name}" does not have deletionProtection enabled. All relational databases must have deletion protection.`
            );
          }
        }
        break;
      }
      case 'require-dead-letter-queue': {
        if (!hasConfig || !guardrail.properties.enabled) break;
        for (const queue of configManager.sqsQueues) {
          if (!(queue as StpSqsQueue).redrivePolicy) {
            throw new ExpectedError(
              'GUARDRAIL',
              `SQS queue "${queue.name}" does not have a redrivePolicy (dead-letter queue) configured. All SQS queues must have a dead-letter queue.`
            );
          }
        }
        break;
      }
      case 'function-memory-limit': {
        if (!hasConfig) break;
        const { maxMemoryMB } = guardrail.properties;
        if (!maxMemoryMB) break;
        const allFnsForMemory = [...configManager.functions, ...configManager.edgeLambdaFunctions];
        for (const fn of allFnsForMemory) {
          const memory = (fn as StpLambdaFunction).memory || 1024;
          if (memory > maxMemoryMB) {
            throw new ExpectedError(
              'GUARDRAIL',
              `Function "${fn.name}" has memory ${memory}MB which exceeds the limit of ${maxMemoryMB}MB.`
            );
          }
        }
        break;
      }
      case 'function-timeout-limit': {
        if (!hasConfig) break;
        const { maxTimeoutSeconds } = guardrail.properties;
        if (!maxTimeoutSeconds) break;
        const allFnsForTimeout = [...configManager.functions, ...configManager.edgeLambdaFunctions];
        for (const fn of allFnsForTimeout) {
          const timeout = (fn as StpLambdaFunction).timeout || 20;
          if (timeout > maxTimeoutSeconds) {
            throw new ExpectedError(
              'GUARDRAIL',
              `Function "${fn.name}" has timeout ${timeout}s which exceeds the limit of ${maxTimeoutSeconds}s.`
            );
          }
        }
        break;
      }
      case 'container-resource-limit': {
        if (!hasConfig) break;
        const { maxCpu, maxMemoryMB } = guardrail.properties;
        for (const workload of configManager.allContainerWorkloads) {
          const resources = (workload as StpContainerWorkload).resources;
          if (maxCpu && resources?.cpu && resources.cpu > maxCpu) {
            throw new ExpectedError(
              'GUARDRAIL',
              `Container workload "${workload.name}" has ${resources.cpu} vCPU which exceeds the limit of ${maxCpu} vCPU.`
            );
          }
          if (maxMemoryMB && resources?.memory && resources.memory > maxMemoryMB) {
            throw new ExpectedError(
              'GUARDRAIL',
              `Container workload "${workload.name}" has ${resources.memory}MB memory which exceeds the limit of ${maxMemoryMB}MB.`
            );
          }
        }
        break;
      }
      case 'database-engine-restriction': {
        if (!hasConfig) break;
        const { allowedEngines } = guardrail.properties;
        if (!allowedEngines?.length) break;
        for (const db of configManager.databases) {
          const engineType = (db as StpRelationalDatabase).engine?.type;
          if (engineType && !allowedEngines.includes(engineType)) {
            throw new ExpectedError(
              'GUARDRAIL',
              `Database "${db.name}" uses engine "${engineType}" which is not allowed. Allowed engines: ${allowedEngines.join(', ')}.`
            );
          }
        }
        break;
      }
      case 'database-instance-restriction': {
        if (!hasConfig) break;
        const { blockedInstanceSizes } = guardrail.properties;
        if (!blockedInstanceSizes?.length) break;
        for (const db of configManager.databases) {
          const engine = (db as StpRelationalDatabase).engine;
          const instanceSizes = getDbInstanceSizes(engine);
          for (const size of instanceSizes) {
            if (blockedInstanceSizes.includes(size)) {
              throw new ExpectedError(
                'GUARDRAIL',
                `Database "${db.name}" uses instance size "${size}" which is blocked. Blocked instance sizes: ${blockedInstanceSizes.join(', ')}.`
              );
            }
          }
        }
        break;
      }
      case 'require-waf': {
        if (!hasConfig || !guardrail.properties.enabled) break;
        for (const alb of configManager.applicationLoadBalancers) {
          if (!(alb as StpApplicationLoadBalancer).useFirewall) {
            throw new ExpectedError(
              'GUARDRAIL',
              `Application load balancer "${alb.name}" does not have a web application firewall (useFirewall) configured.`
            );
          }
        }
        break;
      }
      case 'require-custom-domain': {
        if (!hasConfig || !guardrail.properties.enabled) break;
        for (const ws of configManager.webServices) {
          if (!(ws as StpWebService).customDomains?.length) {
            throw new ExpectedError('GUARDRAIL', `Web service "${ws.name}" does not have a custom domain configured.`);
          }
        }
        for (const hb of configManager.hostingBuckets) {
          if (!(hb as StpHostingBucket).customDomains?.length) {
            throw new ExpectedError(
              'GUARDRAIL',
              `Hosting bucket "${hb.name}" does not have a custom domain configured.`
            );
          }
        }
        break;
      }
      case 'resource-count-limit': {
        if (!hasConfig) break;
        const { maxResources } = guardrail.properties;
        if (!maxResources) break;
        const resourceCount = configManager.allConfigResources.length;
        if (resourceCount > maxResources) {
          throw new ExpectedError(
            'GUARDRAIL',
            `Stack has ${resourceCount} resources which exceeds the limit of ${maxResources}.`
          );
        }
        break;
      }
    }
  }
};

const getDbInstanceSizes = (engine: StpRelationalDatabase['engine']): string[] => {
  if (!engine) return [];
  const engineType = engine.type;
  if (engineType === 'aurora-mysql-serverless' || engineType === 'aurora-postgresql-serverless') return [];
  if (engineType === 'aurora-mysql-serverless-v2' || engineType === 'aurora-postgresql-serverless-v2') return [];
  if (engineType === 'aurora-mysql' || engineType === 'aurora-postgresql') {
    return ((engine as AuroraEngine).properties?.instances || []).map((i) => i.instanceSize).filter(Boolean);
  }
  // RDS engines
  const rdsProps = (engine as RdsEngine).properties;
  const sizes: string[] = [];
  if (rdsProps?.primaryInstance?.instanceSize) sizes.push(rdsProps.primaryInstance.instanceSize);
  if (rdsProps?.readReplicas) {
    for (const replica of rdsProps.readReplicas) {
      if (replica.instanceSize) sizes.push(replica.instanceSize);
    }
  }
  return sizes;
};

// const validateProviders = () => {
//   if (configManager.atlasMongoClusters.length && !configManager.mongoDbAtlasProvider) {
//     throw new ExpectedError(
//       'CONFIG_VALIDATION',
//       'Error in config. If you want to use atlas-mongo-cluster resources, you need to define "providerConfig.mongoDbAtlas" section in your config.'
//     );
//   }
//   if (
//     (configManager.upstashKafkaTopics.length || configManager.upstashRedisDatabases.length) &&
//     !configManager.upstashProvider
//   ) {
//     throw stpErrors.e21(null);
//   }
// };

const validateBastionReferences = () => {
  [
    ...Object.values(configManager.scripts)
    // ...(Object.values(configManager.hooks) as InlineScriptLifecycleHook[][]).flat()
  ]
    .filter(({ type }) => type === 'bastion-script' || type === 'local-script-with-bastion-tunneling')
    .forEach(({ type, properties: { bastionResource } }: BastionScript | LocalScriptWithBastionTunneling) => {
      if (bastionResource) {
        resolveReferenceToBastion({ referencedFrom: type, stpResourceReference: bastionResource });
      } else if (!configManager.bastions.length) {
        throw stpErrors.e94({ scriptType: type });
      }
    });
};

export const validateReuseVpcConfig = () => {
  const reuseVpc = configManager.config?.stackConfig?.vpc?.reuseVpc;

  if (!reuseVpc) {
    return; // No validation needed if not using reuseVpc
  }

  const hasVpcId = Boolean(reuseVpc.vpcId);
  const hasProjectStage = Boolean(reuseVpc.projectName && reuseVpc.stage);

  // XOR validation: exactly one method must be specified
  if (hasVpcId === hasProjectStage) {
    throw stpErrors.e132(null);
  }

  // If using projectName/stage, both must be present
  if (!hasVpcId && (!reuseVpc.projectName || !reuseVpc.stage)) {
    throw stpErrors.e132(null);
  }
};

// these are only static validations that can be ran after the initial resolving of the config
// however there are some validations that can only be performed after domain services are initialized
// for example validating domain usability etc - those validation are mostly executed as a part of resource resolvers
export const runInitialValidations = () => {
  validateResourceNameUniqueness();
  validateResourceNames();
  validateReuseVpcConfig();
  // validateProviders();
  validateBastionReferences();
  // packaging props
  configManager.allContainerWorkloadContainers.forEach((props) =>
    validatePackagingProps({
      ...props,
      containerName: props.name
    })
  );
  configManager.allBatchJobContainers.forEach((props) =>
    validatePackagingProps({
      ...props
    })
  );
  configManager.allUserCodeLambdas.forEach((props) =>
    validatePackagingProps({
      ...props,
      workloadType: props.type,
      workloadName: props.name,
      lambdaRuntime: props.runtime
    })
  );
  configManager.awsCdkConstructs.forEach((construct) => {
    validateAwsCdkConstructProps({ construct });
  });
  // http-api-gateway
  configManager.allHttpApiGateways.forEach((resource) => {
    validateHttpApiGatewayConfig({ resource });
  });
  // application-load-balancer
  configManager.applicationLoadBalancers.forEach((definition) => {
    validateApplicationLoadBalancerConfig({ definition });
  });
  // network-load-balancer
  configManager.networkLoadBalancers.forEach((definition) => {
    validateNetworkLoadBalancerConfig({ definition });
  });
  // buckets
  configManager.allBuckets.forEach((definition) => {
    validateBucketConfig({ definition });
  });
  configManager.hostingBuckets.forEach((definition) => {
    validateHostingBucketConfig({ definition });
  });
  // relational databases
  configManager.databases.forEach((definition) => {
    validateRelationalDatabaseConfig({ resource: definition });
  });
  // web services
  configManager.webServices.forEach((resource) => {
    validateWebServiceConfig({ resource });
  });
  // multi container workload
  configManager.allContainerWorkloads.forEach((definition) => {
    validateMultiContainerWorkloadConfig({ definition });
  });
  // sns topics
  configManager.snsTopics.forEach((resource) => {
    validateSnsTopicConfig({ resource });
  });
  // sqs queues
  configManager.sqsQueues.forEach((resource) => {
    validateSqsQueueConfig({ resource });
  });
  // nextjs-webs
  configManager.nextjsWebs.forEach((resource) => {
    validateNextjsWebConfig({ resource });
  });
  // ssr-webs (astro, nuxt, sveltekit, solidstart, tanstack, remix)
  configManager.astroWebs.forEach((resource) => {
    validateSsrWebConfig({ resource });
  });
  configManager.nuxtWebs.forEach((resource) => {
    validateSsrWebConfig({ resource });
  });
  configManager.sveltekitWebs.forEach((resource) => {
    validateSsrWebConfig({ resource });
  });
  configManager.solidstartWebs.forEach((resource) => {
    validateSsrWebConfig({ resource });
  });
  configManager.tanstackWebs.forEach((resource) => {
    validateSsrWebConfig({ resource });
  });
  configManager.remixWebs.forEach((resource) => {
    validateSsrWebConfig({ resource });
  });
  // lambdas
  configManager.functions.forEach((resource) => {
    validateLambdaConfig({ definition: resource });
  });
  // buckets
  configManager.buckets.forEach((resource) => {
    validateBucketConfig({ definition: resource });
  });
};
