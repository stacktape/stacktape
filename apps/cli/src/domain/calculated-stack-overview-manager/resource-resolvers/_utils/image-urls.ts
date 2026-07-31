import type { StpBatchJob } from '@domain-services/config-manager/resolved-types/batch-jobs';
import type { StpContainerWorkload } from '@domain-services/config-manager/resolved-types/multi-container-workloads';
import { NOT_YET_KNOWN_IDENTIFIER } from 'src/config/constants';
import type {
  BatchJobContainerPackaging,
  ContainerWorkloadContainerPackaging
} from '@stacktape/config/deployment-artifacts';

const getImageFromContainerDefinition = (
  packaging: BatchJobContainerPackaging | ContainerWorkloadContainerPackaging
) => {
  if (packaging.type === 'prebuilt-image') {
    return packaging.properties.image;
  }
  return NOT_YET_KNOWN_IDENTIFIER;
};

export const getImageUrlForSingleTask = (workloadDefinition: StpBatchJob) => {
  return getImageFromContainerDefinition(workloadDefinition.container.packaging);
};

export const getImageUrlForMultiTask = (workloadDefinition: StpContainerWorkload, containerName: string) => {
  const workloadContainer = workloadDefinition.containers.find((container) => container.name === containerName);
  return getImageFromContainerDefinition(workloadContainer.packaging);
};
