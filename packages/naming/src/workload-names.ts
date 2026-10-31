import { snakeCase } from 'change-case';
import { createHash } from 'node:crypto';

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
const LOCAL_IMAGE_HASH_LENGTH = 10;

/**
 * The local Docker image a container build of a project's job produces on a stage (`dev`, `package` and `deploy` all
 * build it). Before, it was the job name alone (`web-service-container`), so two projects or stages with a same-named
 * workload on one machine overwrote each other's image and dev could run the other project's code. The readable part
 * names the project, stage and job; characters an image name cannot hold become dashes, and a long one is shortened.
 * Dashes make it ambiguous (project `shop` on stage `dev-api` and project `shop-dev` on stage `api` read the same), so
 * a hash of the exact project, stage and job ends the name. It stays the same across builds, so Docker's layer cache
 * keeps working.
 */
export const getLocalImageName = ({
  projectName,
  stage,
  jobName
}: {
  projectName: string;
  stage: string;
  jobName: string;
}) => {
  const hash = createHash('sha256')
    .update(JSON.stringify([projectName, stage, jobName]))
    .digest('hex')
    .slice(0, LOCAL_IMAGE_HASH_LENGTH);
  const readable = `stp-${projectName}-${stage}-${jobName}`
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .slice(0, MAX_LOCAL_IMAGE_NAME_LENGTH - LOCAL_IMAGE_HASH_LENGTH - 1)
    .replace(/-+$/, '');
  return `${readable}-${hash}`;
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
