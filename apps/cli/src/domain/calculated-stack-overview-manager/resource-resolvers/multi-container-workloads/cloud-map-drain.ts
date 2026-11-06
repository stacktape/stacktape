import type { ContainerDefinition } from '@stacktape/cloudformation/resources/aws-ecs-taskdefinition';
import type { StpContainerWorkload } from '@domain-services/config-manager/resolved-types/multi-container-workloads';

export const CLOUD_MAP_DRAIN_CONTAINER_NAME = 'stp-cloudmap-drain';

/**
 * API Gateway can keep routing to an instance after ECS deregisters it from Cloud Map. ECS reverses
 * container dependencies at shutdown: stop this container first, then send SIGTERM to the servers it depends on.
 * This lets even an application that closes immediately on SIGTERM serve the cached routes. It does not add a health
 * check or delay the new application, and the application's own stopTimeout remains available for in-flight work.
 */
export const needsCloudMapDrain = (workload: StpContainerWorkload): boolean =>
  workload.containers.some(({ events }) => events?.some(({ type }) => type === 'http-api-gateway'));

export const getCloudMapDrainContainer = (
  workload: StpContainerWorkload,
  image: string
): ContainerDefinition | undefined => {
  const servers = workload.containers.filter(({ events }) => events?.some(({ type }) => type === 'http-api-gateway'));
  if (!servers.length) return undefined;
  return {
    Name: CLOUD_MAP_DRAIN_CONTAINER_NAME,
    Image: image,
    Essential: false,
    Memory: 16,
    User: '65534',
    ReadonlyRootFilesystem: true,
    EntryPoint: ['/bin/sh', '-c'],
    Command: ["trap 'sleep 35; exit 0' TERM; while :; do sleep 1; done"],
    StopTimeout: 40,
    DependsOn: servers.map(({ name }) => ({ ContainerName: name, Condition: 'START' }))
  };
};
