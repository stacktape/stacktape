import type { IntrinsicFunction } from '../../@generated/cloudform/dataTypes';
import { capitalizeFirstLetter } from '@shared/utils/misc';
import { pascalCase, snakeCase } from 'change-case';
import { Ref, Sub } from '../../@generated/cloudform/functions';
import { CF_TEMPLATE_FILE_NAME_WITHOUT_EXT, STP_TEMPLATE_FILE_NAME_WITHOUT_EXT } from '../../src/config/random';
import type { ComparisonOperator } from '@stacktape/config/alarms';

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

export const portMappingsPortName = (portNum: number) => {
  return `port-${portNum}`;
};

export const injectedParameterEnvVarName = (stpResourceReference: string, parameterName: string) =>
  snakeCase(`STP_${stpResourceReference.replaceAll('.', '_')}_${parameterName}`).toUpperCase();
