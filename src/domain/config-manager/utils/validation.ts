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
import { validateBucketConfig } from './buckets';
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

export const validateGuardrails = (guardrails: GuardrailDefinition[]) => {
  for (const guardrail of guardrails || []) {
    switch (guardrail.type) {
      case 'stage-restriction': {
        const { allowedStages } = guardrail.properties;
        if (!allowedStages.includes(globalStateManager.targetStack.stage)) {
          throw new ExpectedError(
            'GUARDRAIL',
            `Stage ${globalStateManager.targetStack.stage} is not allowed. Allowed stages: ${allowedStages.join(', ')}.`
          );
        }
        break;
      }
      case 'region-restriction': {
        const { allowedRegions } = guardrail.properties;
        if (!allowedRegions.includes(globalStateManager.region)) {
          throw new ExpectedError(
            'GUARDRAIL',
            `Region ${globalStateManager.region} is not allowed. Allowed regions: ${allowedRegions.join(', ')}.`
          );
        }
        break;
      }
    }
  }
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
