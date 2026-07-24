import { createHash } from 'node:crypto';
import { pascalCase, snakeCase } from './case.js';

const stacktapeStackDescriptionPrefix = 'STP-stack';
const cloudformationTemplateFileName = 'cf-template';
const stacktapeTemplateFileName = 'stp-template';

export interface BuiltResourceName {
  readonly name: string;
  readonly truncated: boolean;
}

export const buildResourceNameInfo = ({
  proposedResourceName,
  lengthLimit
}: {
  readonly proposedResourceName: string;
  readonly lengthLimit?: number;
}): BuiltResourceName => {
  if (lengthLimit && proposedResourceName.length > lengthLimit) {
    const hash = createHash('shake256', { outputLength: 3 }).update(proposedResourceName).digest('hex');
    return {
      name: `${proposedResourceName.slice(0, lengthLimit - hash.length - 1)}-${hash}`,
      truncated: true
    };
  }
  return { name: proposedResourceName, truncated: false };
};

export const buildResourceName = (input: {
  readonly proposedResourceName: string;
  readonly lengthLimit?: number;
}): string => buildResourceNameInfo(input).name;

export const getEcrImageTag = (taskName: string, version: string, digest: string): string =>
  `${taskName}--${digest}--${version}`;

export const getBaseAwsConsoleLink = (region: string, serviceName: string, serviceQuery: string): string => {
  const baseUrl = `https://${region}.console.aws.amazon.com/${serviceName}/home?region=${region}#`;
  return `${baseUrl}${serviceQuery}`;
};

export const getEcrImageUrl = (repositoryUrl: string, imageTag: string): string => `${repositoryUrl}:${imageTag}`;

export const getCfTemplateS3Key = (version: string): string => `${cloudformationTemplateFileName}/${version}.yml`;

export const getStpTemplateS3Key = (version: string): string => `${stacktapeTemplateFileName}/${version}.yml`;

export const getCloudformationTemplateUrl = (bucketName: string, region: string, version: string): string =>
  `https://${bucketName}.${getBaseS3EndpointForRegion(region)}/${getCfTemplateS3Key(version)}`;

export const getJobNameForSingleContainerWorkload = (workloadName: string): string =>
  `${workloadName}-default`.toLowerCase();

export const getJobNameForMultiContainerWorkload = (workloadName: string, containerName: string): string =>
  `${workloadName}-${containerName}`.toLowerCase();

export const getJobName = ({
  workloadName,
  workloadType,
  containerName
}: {
  readonly workloadType: string;
  readonly workloadName: string;
  readonly containerName?: string;
}): string => {
  if (workloadType === 'function' || workloadType === 'edge-lambda-function') {
    return workloadName;
  }
  return containerName
    ? getJobNameForMultiContainerWorkload(workloadName, containerName)
    : getJobNameForSingleContainerWorkload(workloadName);
};

export const getStackName = (projectName: string, stage: string): string => `${projectName}-${stage}`;

export const getStackCfTemplateDescription = (
  projectName: string,
  stage: string,
  globallyUniqueStackHash: string
): string => `${stacktapeStackDescriptionPrefix}_${projectName}_${stage}_${globallyUniqueStackHash}`;

export const isStacktapeStackDescription = (templateDescription: string): boolean =>
  Boolean(templateDescription?.startsWith(stacktapeStackDescriptionPrefix));

export const getStacktapeStackInfoFromTemplateDescription = (
  templateDescription: string
): {
  readonly projectName: string | undefined;
  readonly stage: string | undefined;
  readonly globallyUniqueStackHash: string | undefined;
} => {
  if (isStacktapeStackDescription(templateDescription)) {
    const [, projectName, stage, globallyUniqueStackHash] = templateDescription.split('_');
    return { projectName, stage, globallyUniqueStackHash };
  }
  return { projectName: '', stage: '', globallyUniqueStackHash: '' };
};

export const getSimpleServiceDefaultContainerName = (): string => 'service-container';

export const getEcrRepositoryUrl = (accountId: string, region: string, repositoryName: string): string =>
  `${accountId}.dkr.ecr.${region}.amazonaws.com/${repositoryName}`;

export const getBaseS3EndpointForRegion = (region: string): string => {
  if (region.match(/us-gov/)) {
    return `s3-${region}.amazonaws.com`;
  }
  if (region.match(/cn-/)) {
    return `s3.${region}.amazonaws.com.cn`;
  }
  return `s3.${region}.amazonaws.com`;
};

export const getLocalInvokeContainerName = (jobName: string): string => `invoke-local-${jobName}`;

export const getUserPoolDomainPrefix = (stackName: string, userPoolName: string): string =>
  `${stackName}-${userPoolName}`.toLowerCase();

export const buildLambdaS3Key = (functionName: string, version: string, digest: string): string =>
  `${functionName}/${version}${digest ? `-${digest}` : ''}.zip`;

export const buildLayerS3Key = (layerNumber: number, version: string, digest: string): string =>
  `shared-layer-${layerNumber}/${version}${digest ? `-${digest}` : ''}.zip`;

export const getStpNameForResource = ({
  nameChain,
  parentResourceType
}: {
  readonly nameChain: readonly string[];
  readonly parentResourceType?: string;
}): string => {
  const legacyNestedEndpointParents = new Set([
    'web-service',
    'private-service',
    'worker-service',
    'hosting-bucket',
    'custom-resource-definition'
  ]);
  const nestedNames = legacyNestedEndpointParents.has(parentResourceType ?? '')
    ? nameChain.slice(1, -1)
    : nameChain.slice(1);
  return `${nameChain[0]}${nestedNames.map(capitalizeFirstLetter).join('')}`;
};

export const getStpNameForAlarm = ({
  nameChain,
  alarmTriggerType,
  alarmIndexOrGlobalAlarmName
}: {
  readonly nameChain: readonly string[];
  readonly alarmTriggerType: string;
  readonly alarmIndexOrGlobalAlarmName: number | string;
}): string => `${pascalCase(alarmTriggerType)}For${pascalCase(nameChain.join('.'))}${alarmIndexOrGlobalAlarmName}`;

export const getStackOutputName = (resourceName: string, property: string): string =>
  pascalCase(`${resourceName}${capitalizeFirstLetter(property)}`).replace('_', '');

export const getExportedStackOutputName = (stackOutputName: string, stackName: string): string =>
  pascalCase(`${stackName}${capitalizeFirstLetter(stackOutputName)}`).replace('_', '');

export const getLogGroupBaseName = ({
  stpResourceName,
  stackName,
  resourceNamespace,
  resourceType
}: {
  readonly stackName: string;
  readonly resourceType: string;
  readonly stpResourceName: string;
  readonly resourceNamespace: string;
}): string => `/stp/${stackName}/${resourceType}/${stpResourceName}/${resourceNamespace}`;

export const portMappingsPortName = (portNumber: number): string => `port-${portNumber}`;

export const getAlarmDescription = ({
  triggerType,
  threshold,
  comparisonOperator,
  stpResourceName,
  stackName,
  statFunction
}: {
  readonly triggerType: string;
  readonly threshold: number;
  readonly comparisonOperator: string;
  readonly stpResourceName: string;
  readonly stackName: string;
  readonly statFunction?: string;
}): string =>
  `Monitors${statFunction ? ` ${statFunction}` : ''} ${triggerType} of ${stpResourceName} in stack ${stackName}. Triggered when ${comparisonOperator} (${threshold}).`;

export const getCustomAlarmDescription = ({
  metricName,
  threshold,
  comparisonOperator,
  stpResourceName,
  stackName,
  statFunction
}: {
  readonly metricName: string;
  readonly threshold: number;
  readonly comparisonOperator: string;
  readonly stpResourceName: string;
  readonly stackName: string;
  readonly statFunction?: string;
}): string =>
  `Monitors${statFunction ? ` ${statFunction}` : ''} ${metricName} of ${stpResourceName} in stack ${stackName}. Triggered when ${comparisonOperator} (${threshold}).`;

export const getRoleArnFromSessionArn = (sessionArn: string): string => {
  const [prefix = '', roleName] = sessionArn.split('/');
  const accountId = prefix.split(':').at(4);
  return `arn:aws:iam::${accountId}:role/${roleName}`;
};

export const injectedParameterEnvVarName = (resourceReference: string, parameterName: string): string =>
  snakeCase(`STP_${resourceReference.replaceAll('.', '_')}_${parameterName}`).toUpperCase();

export const getEfsVolumeName = (efsFilesystemName: string, rootDirectory?: string): string => {
  const normalizedRootDirectory = (rootDirectory || '/').replace(/\//g, '-').replace(/^-|-$/g, '') || 'Root';
  return `efs-${efsFilesystemName}-${normalizedRootDirectory}`;
};

export const getConvexSecretName = ({
  region,
  stackName,
  nameChain
}: {
  readonly region: string;
  readonly stackName: string;
  readonly nameChain: readonly string[];
}): string => `stp/${region}/${stackName}/${nameChain.join('.')}`;

export const getConvexRuntimeSecretLogicalName = (convexName: string): string =>
  `${pascalCase(convexName)}RuntimeSecret`;

export const getBatchRetryStateName = (instanceKind: string, index: number): string => `${instanceKind}${index}`;

const capitalizeFirstLetter = (value: string): string => value.charAt(0).toUpperCase() + value.slice(1);
