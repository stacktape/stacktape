import type { SupportedFileExt } from '@utils/file-types';
import type { AllSupportedPackagingConfig } from '@domain-services/packaging-manager/types';
import type { StpApplicationLoadBalancer } from '@domain-services/config-manager/resolved-types/application-load-balancers';
import type { StpAwsCdkConstruct } from '@domain-services/config-manager/resolved-types/aws-cdk-construct';
import type { StpLambdaFunction } from '@domain-services/config-manager/resolved-types/functions';
import type { GuardrailDefinition } from '@domain-services/config-manager/resolved-types/guardrails';
import type { StpHostingBucket } from '@domain-services/config-manager/resolved-types/hosting-buckets';
import type { StpContainerWorkload } from '@domain-services/config-manager/resolved-types/multi-container-workloads';
import type { StpOpenSearchDomain } from '@domain-services/config-manager/resolved-types/open-search';
import type { StpRelationalDatabase } from '@domain-services/config-manager/resolved-types/relational-databases';
import type { StpWorkloadType } from '@domain-services/config-manager/resolved-types/resources';
import type { StpSqsQueue } from '@domain-services/config-manager/resolved-types/sqs-queues';
import type { StpWebService } from '@domain-services/config-manager/resolved-types/web-services';
import type { StackContext } from '@domain-services/stack-context';
import { join } from 'node:path';
import {
  lambdaRuntimesForFileExtension,
  linksMap,
  supportedAwsCdkConstructExtensions,
  supportedWorkloadExtensions
} from '@config';
import { isDirAccessible, isFileAccessible } from '@utils/fs-utils';
import { capitalizeFirstLetter, getUniqueDuplicates, isAlphanumeric } from '@utils/misc';
import { CliError } from '@utils/errors';
import { parseUserCodeFilepath } from '@utils/file-loaders';
import type { ConfigManager } from '../index';
import { validateApplicationLoadBalancerConfig } from './application-load-balancers';
import { validateHostingBucketConfig } from './buckets';
import { validateConvexConfig } from './convex';
import { validateHttpApiGatewayConfig } from './http-api-gateways';
import { validateLambdaConfig } from './lambdas';
import { validateContainerSecrets, validateMultiContainerWorkloadConfig } from './multi-container-workloads';
import { validateNetworkLoadBalancerConfig } from './network-load-balancers';
import { validateNextjsWebConfig } from './nextjs-webs';
import { validateSsrWebConfig } from './ssr-webs';
import { validateRelationalDatabaseConfig } from './relational-databases';
import { validateSnsTopicConfig } from './sns-topics';
import { validateSqsQueueConfig } from './sqs-queues';
import { validateWebServiceConfig } from './web-services';
import { validateConfigWithZod } from './zod-validator';
import type { StacktapeConfig } from '@stacktape/config';
import type {
  PyLanguageSpecificConfig,
  StpBuildpackBjImagePackaging,
  StpBuildpackCwImagePackaging,
  StpBuildpackLambdaPackaging
} from '@stacktape/config/deployment-artifacts';
import type { LambdaRuntime } from '@stacktape/config/primitives';
import type { AuroraEngine, RdsEngine } from '@stacktape/config/relational-databases';
import type { BastionScript, LocalScriptWithBastionTunneling } from '@stacktape/config/shared';
import { configErrors } from '../errors';

export const validatePackagingProps = ({
  packaging,
  workloadName,
  containerName,
  lambdaRuntime,
  workloadType,
  workingDir
}: {
  packaging: AllSupportedPackagingConfig;
  workloadName: string;
  containerName?: string;
  lambdaRuntime?: LambdaRuntime;
  workloadType: StpWorkloadType;
  workingDir: string;
}) => {
  const workloadDescription = `${capitalizeFirstLetter(workloadType)} \`${workloadName}\`${
    containerName && workloadType === 'multi-container-workload' ? ` (container \`${containerName}\`)` : ''
  }`;
  const cwdHint =
    'Paths are resolved relative to `--currentWorkingDirectory` or the directory containing the Stacktape config.';
  if (packaging.type === 'stacktape-image-buildpack' || packaging.type === 'stacktape-lambda-buildpack') {
    const { entryfilePath } = packaging.properties;
    const { extension, filePath, handler, hasExplicitHandler } = parseUserCodeFilepath({
      codeType: `${workloadDescription} entryfilePath`,
      fullPath: entryfilePath,
      workingDir
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
        throw new CliError({
          category: 'PACKAGING_CONFIG',
          code: 'PACKAGING_ENTRYFILE_EXTENSION_UNSUPPORTED',
          message: `${workloadDescription} has unsupported entry-file extension \`.${extension}\`.`
        });
      }
      throw new CliError({
        category: 'NOT_YET_IMPLEMENTED',
        code: 'PACKAGING_LANGUAGE_NOT_SUPPORTED',
        message: `Packaging \`.${extension}\` compute resources is not yet supported.`,
        hints: issue
      });
    }

    if (filePath && workloadType === 'function') {
      const allowedRuntimes = lambdaRuntimesForFileExtension[extension];
      if (!allowedRuntimes) {
        throw new CliError({
          category: 'PACKAGING_CONFIG',
          code: 'PACKAGING_LAMBDA_ENTRYFILE_EXTENSION_UNSUPPORTED',
          message: `${workloadDescription} cannot use entry file \`${filePath}\` with extension \`.${extension}\`.`
        });
      }
      if (lambdaRuntime && !allowedRuntimes.includes(lambdaRuntime)) {
        throw new CliError({
          category: 'PACKAGING_CONFIG',
          code: 'PACKAGING_LAMBDA_RUNTIME_INCOMPATIBLE',
          message: `${workloadDescription} cannot use runtime \`${lambdaRuntime}\` with a \`.${extension}\` entry file.`,
          hints: `Compatible runtimes: ${allowedRuntimes.map((runtime) => `\`${runtime}\``).join(', ')}.`
        });
      }
    }
    if (!isFileAccessible(filePath)) {
      throw new CliError({
        category: 'PACKAGING_CONFIG',
        code: 'PACKAGING_ENTRYFILE_MISSING',
        message: `${workloadDescription} entry file \`${filePath}\` does not exist or is not accessible.`,
        hints: cwdHint
      });
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
      ? join(workingDir, buildContextPath, dockerfilePath || 'Dockerfile')
      : join(workingDir, dockerfilePath || 'Dockerfile');
    if (!isFileAccessible(fullLocation)) {
      throw new CliError({
        category: 'PACKAGING_CONFIG',
        code: 'PACKAGING_DOCKERFILE_MISSING',
        message: `${workloadDescription} Dockerfile \`${fullLocation}\` does not exist or is not accessible.`,
        hints: cwdHint
      });
    }
  } else if (packaging.type === 'custom-artifact') {
    const { packagePath } = packaging.properties;
    const fullLocation = join(workingDir, packagePath);
    if (!isFileAccessible(fullLocation) && !isDirAccessible(fullLocation)) {
      throw new CliError({
        category: 'PACKAGING_CONFIG',
        code: 'PACKAGING_ARTIFACT_PATH_MISSING',
        message: `${workloadDescription} artifact path \`${fullLocation}\` does not exist or is not accessible.`,
        hints: cwdHint
      });
    }
  } else if (packaging.type === 'external-buildpack') {
    const { sourceDirectoryPath } = packaging.properties;
    const fullLocation = join(workingDir, sourceDirectoryPath);
    if (!isFileAccessible(fullLocation) && !isDirAccessible(fullLocation)) {
      throw new CliError({
        category: 'PACKAGING_CONFIG',
        code: 'PACKAGING_SOURCE_DIRECTORY_MISSING',
        message: `${workloadDescription} source directory \`${fullLocation}\` does not exist or is not accessible.`,
        hints: cwdHint
      });
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
    throw configErrors.runAppAsPackagingInvalid({ workloadName, workloadType });
  }
  if (!hasAppVariableSpecified && languageSpecificConfig?.runAppAs) {
    throw configErrors.pythonAppVariableRequired({
      entryfilePath: packaging.properties.entryfilePath,
      workloadName,
      workloadType
    });
  }
  if (hasAppVariableSpecified && !languageSpecificConfig?.runAppAs) {
    throw configErrors.pythonAppVariableRequiresRunAppAs({ workloadName, workloadType, appVariable });
  }
};

export const validateAwsCdkConstructProps = ({
  construct,
  workingDir
}: {
  construct: StpAwsCdkConstruct;
  workingDir: string;
}) => {
  const constructDescription = `${capitalizeFirstLetter('aws-cdk-construct')} \`${construct.name}\``;
  const cwdHint =
    'Paths are resolved relative to `--currentWorkingDirectory` or the directory containing the Stacktape config.';

  const { entryfilePath } = construct;
  if (!entryfilePath) {
    throw new CliError({
      category: 'CONFIG',
      code: 'CONFIG_CDK_ENTRYFILE_REQUIRED',
      message: `${constructDescription} is missing \`properties.entryfilePath\`.`,
      hints: `Point it to the file exporting your construct class. ${cwdHint}`
    });
  }
  const { extension, filePath } = parseUserCodeFilepath({
    codeType: `${constructDescription} entryfilePath`,
    fullPath: entryfilePath,
    workingDir
  });
  if (!supportedAwsCdkConstructExtensions.includes(extension as SupportedFileExt)) {
    throw new CliError({
      category: 'NOT_YET_IMPLEMENTED',
      code: 'PACKAGING_CDK_LANGUAGE_NOT_SUPPORTED',
      message: `Packaging \`.${extension}\` AWS CDK constructs is not yet supported.`
    });
  }
  if (!isFileAccessible(filePath)) {
    throw new CliError({
      category: 'CONFIG',
      code: 'CONFIG_CDK_ENTRYFILE_MISSING',
      message: `${constructDescription} entry file \`${filePath}\` does not exist or is not accessible.`,
      hints: cwdHint
    });
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
    throw new CliError({
      category: 'CONFIG_VALIDATION',
      code: 'CONFIG_SCHEMA_INVALID',
      message: zodResult.errorMessage
    });
  }
};

export const validateResourceNameUniqueness = ({ configManager }: { configManager: ConfigManager }) => {
  const resourceNames = configManager.allConfigResources.map(({ name }) => name);
  const duplicates = getUniqueDuplicates(resourceNames);
  if (duplicates.length) {
    throw new CliError({
      category: 'CONFIG_VALIDATION',
      code: 'CONFIG_RESOURCE_NAME_DUPLICATE',
      message: `Resource names must be unique. Duplicates: ${duplicates.map((name) => `\`${name}\``).join(', ')}.`
    });
  }
};

export const validateResourceNames = ({ configManager }: { configManager: ConfigManager }) => {
  configManager.allConfigResources.forEach(({ name }) => {
    if (!isAlphanumeric(name)) {
      throw new CliError({
        category: 'CONFIG_VALIDATION',
        code: 'CONFIG_RESOURCE_NAME_INVALID',
        message: `Resource name \`${name}\` is invalid. Resource names must be alphanumeric.`
      });
    }
  });
};

const guardrailViolation = (code: string, message: string) =>
  new CliError({
    category: 'GUARDRAIL',
    code,
    message
  });

export const validateGuardrails = ({
  guardrails,
  hasConfig,
  configManager,
  stackContext
}: {
  guardrails: GuardrailDefinition[];
  hasConfig: boolean;
  configManager: ConfigManager;
  stackContext: StackContext;
}) => {
  for (const guardrail of guardrails || []) {
    switch (guardrail.type) {
      case 'stage-restriction': {
        const { allowedStages } = guardrail.properties;
        if (allowedStages?.length && !allowedStages.includes(stackContext.stage)) {
          throw guardrailViolation(
            'GUARDRAIL_STAGE_RESTRICTED',
            `Stage \`${stackContext.stage}\` is not allowed. Allowed stages: ${allowedStages.map((stage) => `\`${stage}\``).join(', ')}.`
          );
        }
        break;
      }
      case 'region-restriction': {
        const { allowedRegions } = guardrail.properties;
        if (allowedRegions?.length && !allowedRegions.includes(stackContext.region)) {
          throw guardrailViolation(
            'GUARDRAIL_REGION_RESTRICTED',
            `Region \`${stackContext.region}\` is not allowed. Allowed regions: ${allowedRegions.map((region) => `\`${region}\``).join(', ')}.`
          );
        }
        break;
      }
      case 'command-restriction': {
        const { blockedCommands } = guardrail.properties;
        if (blockedCommands?.length && blockedCommands.includes(stackContext.command)) {
          throw guardrailViolation(
            'GUARDRAIL_COMMAND_BLOCKED',
            `Command \`${stackContext.command}\` is blocked. Blocked commands: ${blockedCommands.map((command) => `\`${command}\``).join(', ')}.`
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
            throw guardrailViolation(
              'GUARDRAIL_RESOURCE_TYPE_BLOCKED',
              `Resource \`${resource.name}\` uses blocked type \`${resource.type}\`. Blocked resource types: ${blockedResourceTypes.map((type) => `\`${type}\``).join(', ')}.`
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
            throw guardrailViolation(
              'GUARDRAIL_DATABASE_VPC_REQUIRED',
              `Database \`${db.name}\` uses accessibility mode \`${accessibilityMode}\`. It must use \`vpc\` or \`scoping-workloads-in-vpc\`.`
            );
          }
        }
        for (const os of configManager.openSearchDomains) {
          const accessibilityMode = (os as StpOpenSearchDomain).accessibility?.accessibilityMode || 'internet';
          if (!vpcOnlyModes.includes(accessibilityMode)) {
            throw guardrailViolation(
              'GUARDRAIL_OPENSEARCH_VPC_REQUIRED',
              `OpenSearch domain \`${os.name}\` uses accessibility mode \`${accessibilityMode}\`. It must use \`vpc\` or \`scoping-workloads-in-vpc\`.`
            );
          }
        }
        break;
      }
      case 'require-deletion-protection': {
        if (!hasConfig || !guardrail.properties.enabled) break;
        for (const db of configManager.databases) {
          if (!(db as StpRelationalDatabase).deletionProtection) {
            throw guardrailViolation(
              'GUARDRAIL_DATABASE_DELETION_PROTECTION_REQUIRED',
              `Database \`${db.name}\` must enable \`deletionProtection\`.`
            );
          }
        }
        break;
      }
      case 'require-dead-letter-queue': {
        if (!hasConfig || !guardrail.properties.enabled) break;
        for (const queue of configManager.sqsQueues) {
          if (!(queue as StpSqsQueue).redrivePolicy) {
            throw guardrailViolation(
              'GUARDRAIL_SQS_DEAD_LETTER_QUEUE_REQUIRED',
              `SQS queue \`${queue.name}\` must configure a \`redrivePolicy\` with a dead-letter queue.`
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
            throw guardrailViolation(
              'GUARDRAIL_FUNCTION_MEMORY_EXCEEDED',
              `Function \`${fn.name}\` uses \`${memory} MB\`, exceeding the \`${maxMemoryMB} MB\` limit.`
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
            throw guardrailViolation(
              'GUARDRAIL_FUNCTION_TIMEOUT_EXCEEDED',
              `Function \`${fn.name}\` uses a \`${timeout}s\` timeout, exceeding the \`${maxTimeoutSeconds}s\` limit.`
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
            throw guardrailViolation(
              'GUARDRAIL_CONTAINER_CPU_EXCEEDED',
              `Container workload \`${workload.name}\` uses \`${resources.cpu} vCPU\`, exceeding the \`${maxCpu} vCPU\` limit.`
            );
          }
          if (maxMemoryMB && resources?.memory && resources.memory > maxMemoryMB) {
            throw guardrailViolation(
              'GUARDRAIL_CONTAINER_MEMORY_EXCEEDED',
              `Container workload \`${workload.name}\` uses \`${resources.memory} MB\`, exceeding the \`${maxMemoryMB} MB\` limit.`
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
            throw guardrailViolation(
              'GUARDRAIL_DATABASE_ENGINE_RESTRICTED',
              `Database \`${db.name}\` uses disallowed engine \`${engineType}\`. Allowed engines: ${allowedEngines.map((engine) => `\`${engine}\``).join(', ')}.`
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
              throw guardrailViolation(
                'GUARDRAIL_DATABASE_INSTANCE_SIZE_BLOCKED',
                `Database \`${db.name}\` uses blocked instance size \`${size}\`. Blocked sizes: ${blockedInstanceSizes.map((instanceSize) => `\`${instanceSize}\``).join(', ')}.`
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
            throw guardrailViolation(
              'GUARDRAIL_WAF_REQUIRED',
              `Application load balancer \`${alb.name}\` must enable \`useFirewall\`.`
            );
          }
        }
        break;
      }
      case 'require-custom-domain': {
        if (!hasConfig || !guardrail.properties.enabled) break;
        for (const ws of configManager.webServices) {
          if (!(ws as StpWebService).customDomains?.length) {
            throw guardrailViolation(
              'GUARDRAIL_CUSTOM_DOMAIN_REQUIRED',
              `Web service \`${ws.name}\` must configure a custom domain.`
            );
          }
        }
        for (const hb of configManager.hostingBuckets) {
          if (!(hb as StpHostingBucket).customDomains?.length) {
            throw guardrailViolation(
              'GUARDRAIL_CUSTOM_DOMAIN_REQUIRED',
              `Hosting bucket \`${hb.name}\` must configure a custom domain.`
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
          throw guardrailViolation(
            'GUARDRAIL_RESOURCE_COUNT_EXCEEDED',
            `Stack has \`${resourceCount}\` resources, exceeding the limit of \`${maxResources}\`.`
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

const validateBastionReferences = ({ configManager }: { configManager: ConfigManager }) => {
  [
    ...Object.values(configManager.scripts)
    // ...(Object.values(configManager.hooks) as InlineScriptLifecycleHook[][]).flat()
  ]
    .filter(({ type }) => type === 'bastion-script' || type === 'local-script-with-bastion-tunneling')
    .forEach(({ type, properties: { bastionResource } }: BastionScript | LocalScriptWithBastionTunneling) => {
      if (bastionResource) {
        const { resource, restPath, validPath, fullyResolved } = configManager.findResourceInConfig({
          nameChain: bastionResource.split('.')
        });
        if (!fullyResolved || resource.type !== 'bastion') {
          throw configErrors.unresolvedResourceReference({
            stpResourceName: bastionResource,
            stpResourceType: 'bastion',
            referencedFrom: type,
            validResourcePath: validPath,
            invalidRestResourcePath: restPath,
            possibleNestedResources: Object.keys(resource?._nestedResources || {}),
            incorrectResourceType: resource?.type !== 'bastion'
          });
        }
      } else if (!configManager.bastions.length) {
        throw configErrors.bastionScriptRequiresBastion({ scriptType: type });
      }
    });
};

export const validateReuseVpcConfig = ({ configManager }: { configManager: ConfigManager }) => {
  const reuseVpc = configManager.config?.stackConfig?.vpc?.reuseVpc;

  if (!reuseVpc) {
    return; // No validation needed if not using reuseVpc
  }

  const hasVpcId = Boolean(reuseVpc.vpcId);
  const hasProjectStage = Boolean(reuseVpc.projectName && reuseVpc.stage);

  // XOR validation: exactly one method must be specified
  if (hasVpcId === hasProjectStage) {
    throw configErrors.reusedVpcSelectorInvalid(null);
  }

  // If using projectName/stage, both must be present
  if (!hasVpcId && (!reuseVpc.projectName || !reuseVpc.stage)) {
    throw configErrors.reusedVpcSelectorInvalid(null);
  }
};

// these are only static validations that can be ran after the initial resolving of the config
// however there are some validations that can only be performed after domain services are initialized
// for example validating domain usability etc - those validation are mostly executed as a part of resource resolvers
export const runInitialValidations = ({
  configManager,
  stackContext
}: {
  configManager: ConfigManager;
  stackContext: StackContext;
}) => {
  validateResourceNameUniqueness({ configManager });
  validateResourceNames({ configManager });
  validateReuseVpcConfig({ configManager });
  // validateProviders();
  validateBastionReferences({ configManager });
  // packaging props
  configManager.allContainerWorkloadContainers.forEach((props) =>
    validatePackagingProps({
      ...props,
      containerName: props.name,
      workingDir: stackContext.workingDir
    })
  );
  configManager.allBatchJobContainers.forEach((props) =>
    validatePackagingProps({
      ...props,
      workingDir: stackContext.workingDir
    })
  );
  configManager.allUserCodeLambdas.forEach((props) =>
    validatePackagingProps({
      ...props,
      workloadType: props.type,
      workloadName: props.name,
      lambdaRuntime: props.runtime,
      workingDir: stackContext.workingDir
    })
  );
  configManager.awsCdkConstructs.forEach((construct) => {
    validateAwsCdkConstructProps({ construct, workingDir: stackContext.workingDir });
  });
  configManager.convexes.forEach((resource) => {
    validateConvexConfig({ resource, workingDir: stackContext.workingDir });
  });
  // http-api-gateway
  configManager.allHttpApiGateways.forEach((resource) => {
    validateHttpApiGatewayConfig({ activeConfig: configManager, resource });
  });
  // application-load-balancer
  configManager.applicationLoadBalancers.forEach((definition) => {
    validateApplicationLoadBalancerConfig({ activeConfig: configManager, definition });
  });
  // network-load-balancer
  configManager.networkLoadBalancers.forEach((definition) => {
    validateNetworkLoadBalancerConfig({ activeConfig: configManager, definition });
  });
  configManager.hostingBuckets.forEach((definition) => {
    validateHostingBucketConfig({ definition, workingDir: stackContext.workingDir });
  });
  // relational databases
  configManager.databases.forEach((definition) => {
    validateRelationalDatabaseConfig({ resource: definition });
  });
  // web services
  configManager.webServices.forEach((resource) => {
    validateWebServiceConfig({ resource });
  });
  configManager.batchJobs.forEach((definition) => {
    validateContainerSecrets({
      environment: definition.container.environment,
      secrets: definition.container.secrets,
      workloadName: definition.name
    });
  });
  // multi container workload
  configManager.allContainerWorkloads.forEach((definition) => {
    validateMultiContainerWorkloadConfig({ activeConfig: configManager, definition });
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
    validateNextjsWebConfig({ resource, workingDir: stackContext.workingDir });
  });
  // ssr-webs (astro, nuxt, sveltekit, solidstart, tanstack, remix)
  configManager.astroWebs.forEach((resource) => {
    validateSsrWebConfig({ resource, workingDir: stackContext.workingDir });
  });
  configManager.nuxtWebs.forEach((resource) => {
    validateSsrWebConfig({ resource, workingDir: stackContext.workingDir });
  });
  configManager.sveltekitWebs.forEach((resource) => {
    validateSsrWebConfig({ resource, workingDir: stackContext.workingDir });
  });
  configManager.solidstartWebs.forEach((resource) => {
    validateSsrWebConfig({ resource, workingDir: stackContext.workingDir });
  });
  configManager.tanstackWebs.forEach((resource) => {
    validateSsrWebConfig({ resource, workingDir: stackContext.workingDir });
  });
  configManager.remixWebs.forEach((resource) => {
    validateSsrWebConfig({ resource, workingDir: stackContext.workingDir });
  });
  // lambdas
  configManager.functions.forEach((resource) => {
    validateLambdaConfig({ definition: resource });
  });
};
