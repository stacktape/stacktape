import type { KnownCloudFormationResource } from '@stacktape/cloudformation/resource';
import type { ResourceDifference } from '@aws-cdk/cloudformation-diff';
import type { ContainerDefinition, TaskDefinition as SdkTaskDefinition } from '@aws-sdk/client-ecs';
import { tagNames } from '@stacktape/naming/tag-names';
import { lowerCaseFirstCharacterOfObjectKeys, serialize } from '@utils/misc';
import isEqual from 'lodash/isEqual';
import orderBy from 'lodash/orderBy';

type Properties = Record<string, any>;
type Resource = { Properties?: Properties } & Record<string, unknown>;

const propertiesOf = (change: ResourceDifference): { before: Properties; after: Properties } => ({
  before: (change.oldValue?.Properties ?? {}) as Properties,
  after: (change.newValue?.Properties ?? {}) as Properties
});

/** Compares the whole resources, attributes such as `DependsOn` included, after removing what may change. */
const differsOnlyIn = (change: ResourceDifference, strip: (properties: Properties) => Properties) => {
  const normalize = (resource: Resource | undefined) => ({
    ...resource,
    Properties: strip(resource?.Properties ?? {})
  });
  return isEqual(normalize(change.oldValue as Resource), normalize(change.newValue as Resource));
};

/**
 * A task definition can be updated directly when only the images of its containers changed, and each changed image
 * was built by Stacktape before and after. A rollback restores built images by their tags; it could not force the
 * restoration of an external image.
 */
export const isImageOnlyTaskDefinitionChange = (
  change: ResourceDifference,
  isBuiltImage: (image: string) => boolean
) => {
  const imagesOf = (properties: Properties): unknown[] =>
    (properties.ContainerDefinitions ?? []).map(({ Image }: { Image: unknown }) => Image);
  const before = imagesOf(propertiesOf(change).before);
  const changedImagesAreBuilt = imagesOf(propertiesOf(change).after).every(
    (image, index) =>
      isEqual(image, before[index]) ||
      // An image given as a CloudFormation function cannot be classified here.
      (typeof image === 'string' &&
        typeof before[index] === 'string' &&
        isBuiltImage(image) &&
        isBuiltImage(before[index]))
  );
  return (
    changedImagesAreBuilt &&
    differsOnlyIn(change, (properties) => ({
      ...properties,
      ContainerDefinitions: (properties.ContainerDefinitions ?? []).map(({ Image: _image, ...container }) => container)
    }))
  );
};

/**
 * A function can be updated directly when only its code changed. Its code digest tag follows the code, and its shared
 * layers tag follows the layers' content, which `isContentOnlyLayerChange` judges on the layer resource itself.
 */
export const isCodeOnlyFunctionChange = (change: ResourceDifference) =>
  differsOnlyIn(change, ({ Code: _code, Tags = [], ...properties }) => ({
    ...properties,
    Tags: (Tags as { Key: string }[]).filter(
      ({ Key }) => Key !== tagNames.codeDigest() && Key !== tagNames.artifactDigest() && Key !== tagNames.sharedLayers()
    )
  }));

/**
 * A shared chunk layer can be published directly when only its content changed: a new version of the same layer with
 * the same runtimes and description, which is all CloudFormation would do with it.
 */
export const isContentOnlyLayerChange = (change: ResourceDifference) =>
  differsOnlyIn(change, ({ Content: _content, ...properties }) => properties);

/**
 * A deployment script's custom resource carries a timestamp, so it differs on every deployment. When the timestamp is
 * the only change, this returns the script's trigger; otherwise it returns undefined.
 */
export const getTriggerOfUnchangedDeploymentScript = (change: ResourceDifference): string | undefined => {
  const { after } = propertiesOf(change);
  if (!after.scriptFunction || !differsOnlyIn(change, ({ forceUpdate: _timestamp, ...properties }) => properties)) {
    return undefined;
  }
  return after.scriptFunction.triggerType;
};

const pickComparedContainerProperties = (container: ContainerDefinition): ContainerDefinition => {
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

/**
 * Whether the service runs different containers than the task definition built for this deployment. Fast deployments
 * only change images, so comparing the properties a container runs with is enough.
 */
export const compareEcsTaskDefinitions = ({
  calculatedTaskDefinition,
  currentTaskDefinition,
  ignoreImages = false
}: {
  ignoreImages?: boolean;
  calculatedTaskDefinition: KnownCloudFormationResource<'AWS::ECS::TaskDefinition'>;
  currentTaskDefinition: SdkTaskDefinition;
}) => {
  const calculatedContainers = (
    lowerCaseFirstCharacterOfObjectKeys(
      calculatedTaskDefinition.Properties.ContainerDefinitions
    ) as ContainerDefinition[]
  ).map(pickComparedContainerProperties);
  const currentContainers = currentTaskDefinition.containerDefinitions.map(pickComparedContainerProperties);
  const normalize = (containers: ReturnType<typeof pickComparedContainerProperties>[]) =>
    orderBy(
      containers.map(({ image, ...container }) => ({
        ...container,
        image: ignoreImages && container.essential !== false ? undefined : image
      })),
      ['name']
    );
  return { needsUpdate: !isEqual(normalize(calculatedContainers), normalize(currentContainers)) };
};
