import type { StpContainerWorkload } from '@domain-services/config-manager/resolved-types/multi-container-workloads';
import { ALLOWED_MEMORY_VALUES_FOR_CPU } from '@stacktape/config/container-workload-resources';
import { CliError } from '@utils/errors';
import type { ConfigManager } from '../index';
import { configErrors } from '../errors';
import type {
  ContainerWorkloadLoadBalancerIntegration,
  ContainerWorkloadLoadBalancerIntegrationProps
} from '@stacktape/config/events';

const validateContainerNamesConsistency = (workload: StpContainerWorkload) => {
  const containerNames: string[] = [];
  // if (workload.containers) {
  workload.containers.forEach(({ name: containerName }) => {
    if (containerNames.includes(containerName)) {
      throw new CliError({
        category: 'CONFIG_VALIDATION',
        code: 'CONFIG_CONTAINER_NAME_DUPLICATE',
        message: `\`${workload.configParentResourceType}\` \`${workload.name}\` defines more than one container named \`${containerName}\`.`
      });
    }
    containerNames.push(containerName);
  });
  workload.containers.forEach(({ name: containerName, dependsOn }) => {
    if (dependsOn) {
      dependsOn.forEach(({ containerName: dependencyName }) => {
        if (!containerNames.includes(dependencyName)) {
          throw new CliError({
            category: 'CONFIG_VALIDATION',
            code: 'CONFIG_CONTAINER_DEPENDENCY_NOT_FOUND',
            message: `Container \`${containerName}\` in \`${workload.name}\` depends on unknown container \`${dependencyName}\`.`
          });
        }
      });
    }
  });
  // }
};

type SingleContainerTargetablePorts = {
  tcp: { containerPort: number }[];
  udp: { containerPort: number }[];
};

type ContainerWorkloadTargetablePorts = {
  [containerName: string]: SingleContainerTargetablePorts;
};

const checkSingleContainerEventsConfiguration = (
  workloadName: string,
  events: StpContainerWorkload['containers'][number]['events'],
  containerName?: string
): SingleContainerTargetablePorts => {
  const usedPorts: SingleContainerTargetablePorts = { tcp: [], udp: [] };
  events.forEach(({ properties: { containerPort }, type }) => {
    const protocol: 'tcp' | 'udp' =
      type === 'workload-internal' ||
      type === 'http-api-gateway' ||
      type === 'application-load-balancer' ||
      type === 'network-load-balancer' ||
      type === 'service-connect'
        ? 'tcp'
        : 'udp';
    // validate if there are not two event integration which use different protocol but same port
    // ATM there is no possibility for this to happen. In the future we would like to support UDP integrations as well
    // therefore this is handled here
    if (
      (protocol === 'tcp' && usedPorts.udp.some(({ containerPort: usedPort }) => containerPort === usedPort)) ||
      (protocol === 'udp' && usedPorts.tcp.some(({ containerPort: usedPort }) => containerPort === usedPort))
    ) {
      throw new CliError({
        category: 'CONFIG_VALIDATION',
        code: 'CONFIG_CONTAINER_PORT_PROTOCOL_CONFLICT',
        message: `Port \`${containerPort}\` in workload \`${workloadName}\`${
          containerName ? `, container \`${containerName}\`,` : ''
        } is assigned to conflicting protocols.`
      });
    } else {
      usedPorts[protocol].push({ containerPort }); // availabilityCheck: loadBalancerCheck
    }
  });
  return usedPorts;
};

const validatePortOverlapOfContainerWorkload = (workload: StpContainerWorkload) => {
  const usedPorts: ContainerWorkloadTargetablePorts = {};
  workload.containers.forEach(({ name: containerName, events }) => {
    if (events) {
      usedPorts[containerName] = checkSingleContainerEventsConfiguration(workload.name, events, containerName);
    }
  });
  const portsEntries = Object.entries(usedPorts);
  portsEntries.forEach(([container1, ports1], i) => {
    const exposedPorts1 = ports1 as SingleContainerTargetablePorts;
    portsEntries.forEach(([container2, ports2], j) => {
      const exposedPorts2 = ports2 as SingleContainerTargetablePorts;
      if (j <= i) {
        return;
      }
      // check port overlaps between multiple containers
      Object.entries(exposedPorts1).forEach(([_protocol, portList]) => {
        portList.forEach(({ containerPort }) => {
          if (
            exposedPorts2.tcp.some(({ containerPort: usedPort }) => containerPort === usedPort) ||
            exposedPorts2.udp.some(({ containerPort: usedPort }) => containerPort === usedPort)
          ) {
            throw new CliError({
              category: 'CONFIG_VALIDATION',
              code: 'CONFIG_CONTAINER_PORT_DUPLICATE',
              message: `Containers \`${container1}\` and \`${container2}\` in \`${workload.name}\` both use port \`${containerPort}\`.`,
              hints: `Every container port mapped through \`events\` must be unique within the \`${workload.configParentResourceType}\`.`
            });
          }
        });
      });
    });
  });
};

const validateLoadBalancerConfigurations = (workload: StpContainerWorkload) => {
  if (workload.deployment) {
    const workloadUsesLoadBalancerEvents = workload.containers.some(({ events }) =>
      (events || []).some(
        (event: ContainerWorkloadLoadBalancerIntegration) => event.type === 'application-load-balancer'
      )
    );
    if (workload.deployment && !workloadUsesLoadBalancerEvents) {
      throw configErrors.deploymentRequiresAlbIntegration({
        stpResourceName: workload.name,
        resourceType: workload.configParentResourceType
      });
    }
    let previousContainerName: string;
    let previousEventProps: ContainerWorkloadLoadBalancerIntegrationProps;
    workload.containers.forEach(({ name, events }) =>
      (events || []).forEach((event: ContainerWorkloadLoadBalancerIntegration) => {
        if (event.type === 'application-load-balancer') {
          // validation checking if only one container uses load balancer
          const previousLbEventTargetedDifferentContainer = previousContainerName && previousContainerName !== name;
          const previousLbEventTargetedDifferentContainerPort =
            previousEventProps && previousEventProps.containerPort !== event.properties.containerPort;
          const previousLbEventUsedDifferentListener =
            previousEventProps && previousEventProps.listenerPort !== event.properties.listenerPort;
          if (
            previousLbEventTargetedDifferentContainer ||
            previousLbEventTargetedDifferentContainerPort ||
            previousLbEventUsedDifferentListener
          ) {
            throw configErrors.deploymentRequiresSingleAlbTarget({
              stpResourceName: workload.name,
              resourceType: workload.configParentResourceType
            });
          }
          previousContainerName = name;
          previousEventProps = event.properties;
        }
      })
    );
  }
};

const validateServiceConnectLimitations = (workload: StpContainerWorkload, activeConfig: ConfigManager) => {
  if (activeConfig.serviceConnectContainerWorkloadsAssociations[workload.name] && workload.deployment) {
    throw configErrors.deploymentIncompatibleWithServiceConnect({
      workloadName: workload.name,
      workloadType: workload.configParentResourceType
    });
  }
};

const validateResourcesConfiguration = (workload: StpContainerWorkload) => {
  if (!workload.resources.instanceTypes && (!workload.resources.cpu || !workload.resources.memory)) {
    throw configErrors.containerResourcesInvalid({ workloadName: workload.name, workloadType: workload.type });
  }
  if (!workload.resources.instanceTypes) {
    validateFargateMemorySetting(workload.resources.memory, workload.resources.cpu, workload.name);
  }
  if (
    workload.resources.enableWarmPool &&
    (!workload.resources.instanceTypes || workload.resources.instanceTypes.length !== 1)
  ) {
    throw configErrors.warmPoolMixedInstanceTypes({
      stpResourceName: workload.name,
      stpResourceType: workload.configParentResourceType
    });
  }
};

const validateScalingConfiguration = (workload: StpContainerWorkload) => {
  if (
    workload.scaling.minInstances < 1 ||
    workload.scaling.maxInstances < 1 ||
    workload.scaling.maxInstances < workload.scaling.minInstances
  ) {
    throw configErrors.scalingRangeInvalid({ workloadName: workload.name, workloadType: workload.type });
  }
};

const validateCpuArchitecture = (workload: StpContainerWorkload) => {
  if (workload.resources.instanceTypes && workload.resources.architecture) {
    throw configErrors.cpuArchitectureWithEc2Invalid({
      stpResourceName: workload.name,
      stpResourceType: workload.configParentResourceType
    });
  }
};

const validateFargateMemorySetting = (
  memory: StpContainerWorkload['resources']['memory'],
  cpu: StpContainerWorkload['resources']['cpu'],
  workloadName: string
) => {
  if (!ALLOWED_MEMORY_VALUES_FOR_CPU[cpu]?.includes(memory)) {
    throw new CliError({
      category: 'CONFIG_VALIDATION',
      code: 'CONFIG_CONTAINER_MEMORY_CPU_INCOMPATIBLE',
      message: `Memory \`${memory}\` is not compatible with CPU \`${cpu}\` for workload \`${workloadName}\`.`,
      hints: `Allowed memory values for CPU \`${cpu}\`: ${ALLOWED_MEMORY_VALUES_FOR_CPU[cpu]
        .map((value) => `\`${value}\``)
        .join(', ')}.`
    });
  }
};

export const validateMultiContainerWorkloadConfig = ({
  activeConfig,
  definition
}: {
  activeConfig: ConfigManager;
  definition: StpContainerWorkload;
}) => {
  validateContainerNamesConsistency(definition);
  validatePortOverlapOfContainerWorkload(definition);
  validateLoadBalancerConfigurations(definition);
  validateServiceConnectLimitations(definition, activeConfig);
  validateResourcesConfiguration(definition);
  validateScalingConfiguration(definition);
  validateCpuArchitecture(definition);
};
