import { tuiManager } from '@application-services/tui-manager';
import { stpErrors } from '@errors';
import { ALLOWED_MEMORY_VALUES_FOR_CPU } from '@shared/aws/fargate';
import { ExpectedError } from '@utils/errors';
import { configManager } from '../index';

const validateContainerNamesConsistency = (workload: StpContainerWorkload) => {
  const containerNames: string[] = [];
  // if (workload.containers) {
  workload.containers.forEach(({ name: containerName }) => {
    if (containerNames.includes(containerName)) {
      throw new ExpectedError(
        'CONFIG_VALIDATION',
        `Conflict within container names of ${workload.configParentResourceType} "${workload.name}. Two or more containers are using the same name "${containerName}"`
      );
    }
    containerNames.push(containerName);
  });
  workload.containers.forEach(({ name: containerName, dependsOn }) => {
    if (dependsOn) {
      dependsOn.forEach(({ containerName: dependencyName }) => {
        if (!containerNames.includes(dependencyName)) {
          throw new ExpectedError(
            'CONFIG_VALIDATION',
            `Conflict within container dependencies of ${workload.configParentResourceType} "${workload.name}". Container with name "${containerName}" depends on non-existent container "${dependencyName}"`
          );
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
      throw new ExpectedError(
        'CONFIG_VALIDATION',
        `Port overlap detected for port number ${containerPort} in ports in container compute resource "${workloadName}" ${
          containerName ? `in container "${containerName}".` : '.'
        }`
      );
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
            throw new ExpectedError(
              'CONFIG_VALIDATION',
              `Port overlap detected within ${workload.configParentResourceType} ${tuiManager.colorize(
                'cyan',
                workload.name
              )}. Container ${tuiManager.colorize('cyan', container1)} and container ${tuiManager.colorize(
                'cyan',
                container2
              )} are using the same port number ${tuiManager.colorize('cyan', containerPort.toString())}.
  Each container port mapped using 'events' must be unique withing the ${workload.configParentResourceType}.`
            );
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
      throw stpErrors.e54({ stpResourceName: workload.name, resourceType: workload.configParentResourceType });
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
            throw stpErrors.e61({ stpResourceName: workload.name, resourceType: workload.configParentResourceType });
          }
          previousContainerName = name;
          previousEventProps = event.properties;
        }
      })
    );
  }
};

const validateServiceConnectLimitations = (workload: StpContainerWorkload) => {
  if (configManager.serviceConnectContainerWorkloadsAssociations[workload.name] && workload.deployment) {
    throw stpErrors.e75({ workloadName: workload.name, workloadType: workload.configParentResourceType });
  }
};

const validateResourcesConfiguration = (workload: StpContainerWorkload) => {
  if (!workload.resources.instanceTypes && (!workload.resources.cpu || !workload.resources.memory)) {
    throw stpErrors.e87({ workloadName: workload.name, workloadType: workload.type });
  }
  if (!workload.resources.instanceTypes) {
    validateFargateMemorySetting(workload.resources.memory, workload.resources.cpu, workload.name);
  }
  if (
    workload.resources.enableWarmPool &&
    (!workload.resources.instanceTypes || workload.resources.instanceTypes.length !== 1)
  ) {
    throw stpErrors.e125({ stpResourceName: workload.name, stpResourceType: workload.configParentResourceType });
  }
};

const validateScalingConfiguration = (workload: StpContainerWorkload) => {
  if (
    (workload.scaling && !workload.scaling.maxInstances) ||
    workload.scaling.maxInstances < workload.scaling.minInstances
  ) {
    throw stpErrors.e89({ workloadName: workload.name, workloadType: workload.type });
  }
};

const validateCpuArchitecture = (workload: StpContainerWorkload) => {
  if (workload.resources.instanceTypes && workload.resources.architecture) {
    throw stpErrors.e126({ stpResourceName: workload.name, stpResourceType: workload.configParentResourceType });
  }
};

const validateFargateMemorySetting = (
  memory: StpContainerWorkload['resources']['memory'],
  cpu: StpContainerWorkload['resources']['cpu'],
  workloadName: string
) => {
  if (!ALLOWED_MEMORY_VALUES_FOR_CPU[cpu]?.includes(memory)) {
    throw new ExpectedError(
      'CONFIG_VALIDATION',
      `Error in resources of container compute resource ${workloadName}. Memory value '${memory}' is not compatible with CPU value '${cpu}'.
Allowed memory values for this CPU setting are: ${ALLOWED_MEMORY_VALUES_FOR_CPU[cpu]}`
    );
  }
};

export const validateMultiContainerWorkloadConfig = ({ definition }: { definition: StpContainerWorkload }) => {
  validateContainerNamesConsistency(definition);
  validatePortOverlapOfContainerWorkload(definition);
  validateLoadBalancerConfigurations(definition);
  validateServiceConnectLimitations(definition);
  validateResourcesConfiguration(definition);
  validateScalingConfiguration(definition);
  validateCpuArchitecture(definition);
};
