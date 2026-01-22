import type { ResourceDifference } from '@aws-cdk/cloudformation-diff';
import type { ContainerDefinition, TaskDefinition as SdkTaskDefinition } from '@aws-sdk/client-ecs';
import type CloudformationTaskDefinition from '@cloudform/ecs/taskDefinition';
import { lowerCaseFirstCharacterOfObjectKeys, serialize } from '@shared/utils/misc';
import isEqual from 'lodash/isEqual';
import orderBy from 'lodash/orderBy';

export const analyzeTaskDefinitionChange = ({
  change,
  cfLogicalName,
  deployedWorkloads
}: {
  change: ResourceDifference;
  cfLogicalName: string;
  deployedWorkloads: { nameChain: string[]; stpResourceName: string; resource: StackInfoMapResource }[];
}) => {
  const resourceIsPartOfWorkload = deployedWorkloads.find(
    ({ resource: { cloudformationChildResources } }) => cfLogicalName in cloudformationChildResources
  );
  // we only analyze resources which are part of workload
  if (resourceIsPartOfWorkload) {
    const updatedProperties = Object.keys(change.propertyUpdates);
    // any update of task definition will trigger new revision -> this means that CF will detect the change and redeploy workload
    const willUpdateCodeOfWorkload = updatedProperties.length && resourceIsPartOfWorkload;
    // we can use hotswap if only change was done within ContainerDefinitions
    const isHotswappable = updatedProperties.length === 1 && updatedProperties[0] === 'ContainerDefinitions';
    return { isHotswappable, willUpdateCodeOfWorkload };
  }
  return { isHotswappable: false };
};

export const analyzeLambdaFunctionChange = ({
  change,
  cfLogicalName,
  deployedWorkloads
}: {
  change: ResourceDifference;
  cfLogicalName: string;
  deployedWorkloads: { nameChain: string[]; stpResourceName: string; resource: StackInfoMapResource }[];
}) => {
  const resourceIsPartOfWorkload = deployedWorkloads.find(
    ({ resource: { cloudformationChildResources } }) => cfLogicalName in cloudformationChildResources
  );
  // we only analyze resources which are part of workload
  if (resourceIsPartOfWorkload) {
    const updatedProperties = Object.keys(change.propertyUpdates);
    const codeHasChanged = updatedProperties.includes('Code');
    const onlyCodeAndTagsHaveChanged =
      updatedProperties.length === 2 && codeHasChanged && updatedProperties.includes('Tags');
    return {
      isHotswappable: onlyCodeAndTagsHaveChanged,
      willUpdateCodeOfWorkload: codeHasChanged && resourceIsPartOfWorkload
    };
  }
  return { isHotswappable: false };
};

export const compareEcsTaskDefinitions = ({
  calculatedTaskDefinition,
  currentTaskDefinition
}: {
  // resourceName: string;
  calculatedTaskDefinition: CloudformationTaskDefinition;
  currentTaskDefinition: SdkTaskDefinition;
}) => {
  const pickProperties = (container: ContainerDefinition): ContainerDefinition => {
    const {
      name,
      image,
      portMappings = [],
      essential,
      environment = [],
      dependsOn = [],
      healthCheck,
      secrets = [],
      mountPoints = []
    } = container;

    return serialize({
      name,
      image,
      portMappings: orderBy(portMappings, ['containerPort'], ['asc']),
      essential,
      environment: orderBy(environment, ['name'], ['asc']),
      dependsOn: orderBy(dependsOn, ['containerName'], ['asc']),
      healthCheck,
      secrets: orderBy(secrets, ['name'], ['asc']),
      mountPoints: orderBy(mountPoints, ['containerPath'], ['asc'])
    });
  };

  const containersInCalculatedDefinition = lowerCaseFirstCharacterOfObjectKeys(
    calculatedTaskDefinition.Properties.ContainerDefinitions
  ).map(pickProperties) as ContainerDefinition[];
  const containersInCurrentDefinition = currentTaskDefinition.containerDefinitions.map(pickProperties);

  const containersHaveChanged = !isEqual(containersInCalculatedDefinition, containersInCurrentDefinition);

  // if nothing is changed we can immediately return
  if (!containersHaveChanged) {
    return { needsUpdate: false };
  }

  // check for non hot-swappable changes
  containersInCalculatedDefinition.forEach((calculatedContainer) => {
    if (!containersInCurrentDefinition.find(({ name }) => name === calculatedContainer.name)) {
      // @todo why throw?
      // throw stpErrors.e9({
      //   resourceName,
      //   configContainers: containersInCalculatedDefinition.map(({ name }) => name).sort(),
      //   currentContainers: containersInCurrentDefinition.map(({ name }) => name).sort()
      // });
    }
  });
  return { needsUpdate: containersHaveChanged };
};

export const analyzeCustomResourceChange = ({ change }: { change: ResourceDifference }) => {
  const updatedProperties = Object.keys(change.propertyUpdates);
  // Deployment scripts use forceUpdate: Date.now() which changes every deploy - these are hotswappable (can skip).
  const onlyForceUpdateHasChanged = updatedProperties.length === 1 && updatedProperties.includes('forceUpdate');
  // Lambda version publisher uses codeDigest which only changes when code changes - NOT hotswappable (must run).
  const codeDigestHasChanged = updatedProperties.includes('codeDigest');

  return {
    isHotswappable: onlyForceUpdateHasChanged && !codeDigestHasChanged
  };
};
