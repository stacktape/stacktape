import { snakeCase } from 'change-case';

export const getJobNameForSingleContainerWorkload = (workloadName: string) => {
  return `${workloadName}-default`.toLowerCase();
};

export const getJobNameForMultiContainerWorkload = (workloadName: string, containerName: string) => {
  return `${workloadName}-${containerName}`.toLowerCase();
};

export const getSimpleServiceDefaultContainerName = () => 'service-container';

export const getLocalInvokeContainerName = (jobName: string) => {
  return `invoke-local-${jobName}`;
};

export const getJobName = ({
  workloadName,
  workloadType,
  containerName
}: {
  workloadType: string;
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

export const portMappingsPortName = (portNum: number) => {
  return `port-${portNum}`;
};

export const injectedParameterEnvVarName = (stpResourceReference: string, parameterName: string) =>
  snakeCase(`STP_${stpResourceReference.replaceAll('.', '_')}_${parameterName}`).toUpperCase();
