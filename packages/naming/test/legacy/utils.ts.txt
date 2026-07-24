import type { IntrinsicFunction } from '../../@generated/cloudform/dataTypes';
import { createHash } from 'node:crypto';
import { STACKTAPE_CF_TEMPLATE_DESCRIPTION_PREFIX } from '@shared/utils/constants';
import { capitalizeFirstLetter } from '@shared/utils/misc';
import { pascalCase, snakeCase } from 'change-case';
import { Ref, Sub } from '../../@generated/cloudform/functions';
import { CF_TEMPLATE_FILE_NAME_WITHOUT_EXT, STP_TEMPLATE_FILE_NAME_WITHOUT_EXT } from '../../src/config/random';
import { arns } from './arns';

// @note image tag that will be used in ECR -
export const getEcrImageTag = (taskName: string, version: string, digest: string) =>
  `${taskName}--${digest}--${version}`;

export const getJobNameForSingleContainerWorkload = (workloadName: string) => {
  return `${workloadName}-default`.toLowerCase();
};

export const getJobNameForMultiContainerWorkload = (workloadName: string, containerName: string) => {
  return `${workloadName}-${containerName}`.toLowerCase();
};

export const getBaseAwsConsoleLink = (region: string, serviceName: string, serviceQuery: string) => {
  const baseUrl = `https://${region}.console.aws.amazon.com/${serviceName}/home?region=${region}#`;
  return `${baseUrl}${serviceQuery}`;
};

export const getBaseCfSubstitutedAwsConsoleLink = (
  serviceName: string,
  serviceQuery: string | IntrinsicFunction,
  region?: string
) => {
  return Sub(`https://\${region}.console.aws.amazon.com/${serviceName}/home?region=\${region}#\${service_query}`, {
    region: region || Ref('AWS::Region'),
    service_query: serviceQuery
  });
};

export const getEcrImageUrl = (repositoryUrl: string, imageTag: string) => `${repositoryUrl}:${imageTag}`;

export const getCloudformationTemplateUrl = (bucketName: string, region: string, version: string) => {
  return `https://${bucketName}.${getBaseS3EndpointForRegion(region)}/${getCfTemplateS3Key(version)}`;
};

export const getCfTemplateS3Key = (version: string) => {
  return `${CF_TEMPLATE_FILE_NAME_WITHOUT_EXT}/${version}.yml`;
};

export const getStpTemplateS3Key = (version: string) => {
  return `${STP_TEMPLATE_FILE_NAME_WITHOUT_EXT}/${version}.yml`;
};

export const getStackName = (projectName: string, stage: string) => {
  return `${projectName}-${stage}`;
};

export const getStackCfTemplateDescription = (projectName: string, stage: string, globallyUniqueStackHash) => {
  return `${STACKTAPE_CF_TEMPLATE_DESCRIPTION_PREFIX}_${projectName}_${stage}_${globallyUniqueStackHash}`;
};

export const isStacktapeStackDescription = (templateDescription: string): boolean => {
  return !!templateDescription?.startsWith(STACKTAPE_CF_TEMPLATE_DESCRIPTION_PREFIX);
};

export const getStacktapeStackInfoFromTemplateDescription = (templateDescription: string) => {
  if (isStacktapeStackDescription(templateDescription)) {
    const [, projectName, stage, globallyUniqueStackHash] = templateDescription.split('_');
    return {
      projectName,
      stage,
      globallyUniqueStackHash
    };
  }
  return { projectName: '', stage: '', globallyUniqueStackHash: '' };
};

export const getSimpleServiceDefaultContainerName = () => 'service-container';

export const getEcrRepositoryUrl = (accountId: string, region: string, repositoryName: string) => {
  return `${accountId}.dkr.ecr.${region}.amazonaws.com/${repositoryName}`;
};

export const getBaseS3EndpointForRegion = (region: string) => {
  if (region.match(/us-gov/)) {
    return `s3-${region}.amazonaws.com`;
  }
  if (region.match(/cn-/)) {
    return `s3.${region}.amazonaws.com.cn`;
  }
  return `s3.${region}.amazonaws.com`;
};

export const getLocalInvokeContainerName = (jobName: string) => {
  return `invoke-local-${jobName}`;
};

export const getJobName = ({
  workloadName,
  workloadType,
  containerName
}: {
  workloadType: StpWorkloadType;
  workloadName: string;
  containerName?: string;
}) => {
  if (workloadType === 'function' || workloadType === 'edge-lambda-function') {
    return workloadName;
  }
  if (containerName) {
    return getJobNameForMultiContainerWorkload(workloadName, containerName);
  }
  return getJobNameForSingleContainerWorkload(workloadName);
};

export const getUserPoolDomainPrefix = (stackName: string, userPoolName: string) => {
  return `${stackName}-${userPoolName}`.toLowerCase();
};

export const buildLambdaS3Key = (functionName: string, version: string, digest: string) => {
  return `${functionName}/${version}${digest ? `-${digest}` : ''}.zip`;
};

export const buildLayerS3Key = (layerNumber: number, version: string, digest: string) => {
  return `shared-layer-${layerNumber}/${version}${digest ? `-${digest}` : ''}.zip`;
};

export const getStpNameForResource = ({
  nameChain,
  // nestedResourceIdentifier,
  parentResourceType
}: {
  nameChain: string[];
  // nestedResourceIdentifier: string;
  parentResourceType?: StpResourceType;
}) => {
  // due to backwards compatibility, stpResourceNames for some nested resources are treated differently
  // this includes nested resources which are defacto application endpoints (application-load-balancer, http-api-gateway within services)
  // changing their name would cause resource replacement and possibly downtime (i.e for those who are manually doing domain management)
  if (
    parentResourceType === 'web-service' ||
    parentResourceType === 'private-service' ||
    parentResourceType === 'worker-service' ||
    parentResourceType === 'hosting-bucket' ||
    parentResourceType === 'custom-resource-definition'
  ) {
    return `${nameChain[0]}${nameChain.slice(1, -1).map(capitalizeFirstLetter).join('')}`;
  }
  return `${nameChain[0]}${nameChain.slice(1).map(capitalizeFirstLetter).join('')}`;
};

export const getStpNameForAlarm = ({
  nameChain,
  alarmTriggerType,
  alarmIndexOrGlobalAlarmName
}: {
  nameChain: string[];
  alarmTriggerType: AlarmTriggerType;
  alarmIndexOrGlobalAlarmName: number | string;
}) => `${pascalCase(alarmTriggerType)}For${pascalCase(nameChain.join('.'))}${alarmIndexOrGlobalAlarmName}`;

class ObfuscatedNamesStateHolder {
  usingObfuscateNames = false;
  setUsingObfuscatedNamesToTrue = () => {
    this.usingObfuscateNames = true;
  };
}

export const obfuscatedNamesStateHolder = new ObfuscatedNamesStateHolder();

export const buildResourceName = ({
  proposedResourceName,
  lengthLimit
}: {
  proposedResourceName: string;
  lengthLimit?: number;
}) => {
  if (lengthLimit && proposedResourceName.length > lengthLimit) {
    obfuscatedNamesStateHolder.setUsingObfuscatedNamesToTrue();
    const hashedName = createHash('shake256', { outputLength: 3 }).update(proposedResourceName).digest('hex');
    return `${proposedResourceName.slice(0, lengthLimit - hashedName.length - 1)}-${hashedName}`;
  }
  return proposedResourceName;
};

export const getStackOutputName = (resourceName: string, property: string) => {
  return pascalCase(`${resourceName}${capitalizeFirstLetter(property)}`).replace('_', '');
};
export const getExportedStackOutputName = (stackOutputName: string, stackName: string) => {
  return pascalCase(`${stackName}${capitalizeFirstLetter(stackOutputName)}`).replace('_', '');
};

export const getLogGroupBaseName = ({
  stpResourceName,
  stackName,
  resourceNamespace,
  resourceType
}: {
  stackName: string;
  resourceType: 'ecs' | 'rds' | 'lambda' | 'api-gateway' | 'batch' | 'redis' | 'open-search' | 'bastion';
  stpResourceName: string;
  resourceNamespace: string;
}) => {
  return `/stp/${stackName}/${resourceType}/${stpResourceName}/${resourceNamespace}`;
};

export const getAlarmDescription = ({
  triggerType,
  threshold,
  comparisonOperator,
  stpResourceName,
  stackName,
  statFunction
}: {
  triggerType: AlarmDefinition['trigger']['type'];
  threshold: number;
  comparisonOperator: ComparisonOperator;
  stpResourceName: string;
  stackName: string;
  statFunction?: string;
}) => {
  return `Monitors${
    statFunction ? ` ${statFunction}` : ''
  } ${triggerType} of ${stpResourceName} in stack ${stackName}. Triggered when ${comparisonOperator} (${threshold}).`;
  // return JSON.stringify({ stackName, stpResourceName, triggerType, comparisonOperator, threshold });
};

export const getCustomAlarmDescription = ({
  metricName,
  threshold,
  comparisonOperator,
  stpResourceName,
  stackName,
  statFunction
}: {
  metricName: string;
  threshold: number;
  comparisonOperator: ComparisonOperator;
  stpResourceName: string;
  stackName: string;
  statFunction?: string;
}) => {
  return `Monitors${
    statFunction ? ` ${statFunction}` : ''
  } ${metricName} of ${stpResourceName} in stack ${stackName}. Triggered when ${comparisonOperator} (${threshold}).`;
  // return JSON.stringify({ stackName, stpResourceName, triggerType, comparisonOperator, threshold });
};

export const getRoleArnFromSessionArn = (sessionArn: string) => {
  const [prefix, roleName] = sessionArn.split('/');
  const awsAccount = prefix.split(':').at(4);
  return arns.iamRole({ accountId: awsAccount, roleAwsName: roleName });
};

export const portMappingsPortName = (portNum: number) => {
  return `port-${portNum}`;
};

export const injectedParameterEnvVarName = (stpResourceReference: string, parameterName: string) =>
  snakeCase(`STP_${stpResourceReference.replaceAll('.', '_')}_${parameterName}`).toUpperCase();
