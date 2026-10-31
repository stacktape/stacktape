import { snakeCase } from 'change-case';
import { shortHash } from './short-hash';

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

/** Docker allows 255 characters for an image name; this leaves room for a registry host in front of it. */
const MAX_LOCAL_IMAGE_NAME_LENGTH = 128;

/**
 * The local Docker image a container build of a stack's job produces (`dev`, `package` and `deploy` all build it).
 * Before, it was the job name alone (`web-service-container`), so two projects or stages with a same-named workload
 * on one machine overwrote each other's image and dev could run the other project's code. The stack name (project and
 * stage) keeps them apart; the name stays the same across builds, so Docker's layer cache keeps working. Characters a
 * Docker image name cannot hold become dashes, and a name too long for it is shortened and gets a hash of the full one.
 */
export const getLocalImageName = ({ stackName, jobName }: { stackName: string; jobName: string }) => {
  const name = `stp-${stackName}-${jobName}`
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+$/, '');
  if (name.length <= MAX_LOCAL_IMAGE_NAME_LENGTH) return name;
  const hash = shortHash(name).padStart(8, '0');
  return `${name.slice(0, MAX_LOCAL_IMAGE_NAME_LENGTH - hash.length - 1).replace(/-+$/, '')}-${hash}`;
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
