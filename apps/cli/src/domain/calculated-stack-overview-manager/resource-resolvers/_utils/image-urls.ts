import { NOT_YET_KNOWN_IDENTIFIER } from '@shared/utils/constants';

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
