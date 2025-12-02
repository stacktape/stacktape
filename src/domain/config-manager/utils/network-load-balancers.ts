import { configManager } from '@domain-services/config-manager';
import { stpErrors } from '@errors';
import { ExpectedError } from '@utils/errors';
import { getPropsOfResourceReferencedInConfig } from './resource-references';

const validateListenerPortOverlap = ({ loadBalancer }: { loadBalancer: StpNetworkLoadBalancer }) => {
  const encounteredPorts = new Set<number>();
  loadBalancer.listeners.forEach(({ port }) => {
    if (encounteredPorts.has(port)) {
      throw new ExpectedError(
        'CONFIG_VALIDATION',
        `Error in load-balancer ${loadBalancer.name}. Two or more listeners are using the same port "${port}".`,
        'Each listener must use unique port'
      );
    }
    encounteredPorts.add(port);
  });
};

const validateNetworkLoadBalancerIntegrations = ({
  loadBalancerDefinition
}: {
  loadBalancerDefinition: StpNetworkLoadBalancer;
}) => {
  loadBalancerDefinition.listeners.forEach(({ port }) => {
    const existingIntegrations = getAllIntegrationsForNetworkLoadBalancerListener({
      stpLoadBalancerName: loadBalancerDefinition.name,
      listenerPort: port
    });

    if (existingIntegrations.length !== 1) {
      throw stpErrors.e116({
        stpLoadBalancerName: loadBalancerDefinition.name,
        port,
        referencingWorkloadNames: existingIntegrations.map(({ workloadName }) => workloadName)
      });
    }
  });
};

export const validateNetworkLoadBalancerConfig = ({ definition }: { definition: StpNetworkLoadBalancer }) => {
  validateListenerPortOverlap({ loadBalancer: definition });
  validateNetworkLoadBalancerIntegrations({ loadBalancerDefinition: definition });
};

export const resolveReferenceToNetworkLoadBalancer = (
  lbReference: ContainerWorkloadNetworkLoadBalancerIntegrationProps,
  referencedFrom: string,
  referencedFromType?: StpWorkloadType | 'alarm'
  // resolveListenerInfo = true
): StpResolvedNetworkLoadBalancerReference => {
  const referencedLoadBalancer = getPropsOfResourceReferencedInConfig({
    stpResourceReference: lbReference.loadBalancerName,
    stpResourceType: 'network-load-balancer',
    referencedFrom,
    referencedFromType
  });
  // if (resolveListenerInfo) {
  const referencedListener = referencedLoadBalancer?.listeners.find(({ port }) => port === lbReference.listenerPort);
  if (!referencedListener) {
    throw new ExpectedError(
      'CONFIG_VALIDATION',
      `Error in network load-balancer ${referencedLoadBalancer.name}. No listener found for port ${lbReference.listenerPort}.`,
      'Make sure the specified listenerPort matches a defined listener'
    );
  }
  return {
    ...lbReference,
    loadBalancer: referencedLoadBalancer,
    protocol: referencedListener.protocol || 'TLS',
    listenerHasCustomCerts: Boolean(referencedListener.customCertificateArns?.length)
  } as StpResolvedNetworkLoadBalancerReference;
  // }
  // return {
  //   ...lbReference,
  //   loadBalancer: referencedLoadBalancer,
  //   listenerPort: 443,
  //   protocol: 'TLS',
  //   listenerHasCustomCerts: false
  // };
};

export const getAllIntegrationsForNetworkLoadBalancerListener = ({
  stpLoadBalancerName,
  listenerPort
}: {
  stpLoadBalancerName: string;
  listenerPort: number;
}): (ContainerWorkloadNetworkLoadBalancerIntegrationProps & { workloadName: string })[] => {
  const result: (ContainerWorkloadNetworkLoadBalancerIntegrationProps & { workloadName: string })[] = [];
  configManager.allContainerWorkloads.forEach(({ containers, name }) =>
    containers.forEach(({ events }) => {
      if (events) {
        events.forEach((event) => {
          if (event.type === 'network-load-balancer') {
            const eventListenerPort =
              (event.properties as ContainerWorkloadNetworkLoadBalancerIntegrationProps).listenerPort || 443;
            if (
              resolveReferenceToNetworkLoadBalancer(event.properties, name).loadBalancer.name === stpLoadBalancerName &&
              eventListenerPort === listenerPort
            ) {
              result.push({ ...event.properties, listenerPort: eventListenerPort, workloadName: name });
            }
          }
        });
      }
    })
  );
  return result;
};
