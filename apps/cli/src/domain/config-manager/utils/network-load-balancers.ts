import type {
  StpNetworkLoadBalancer,
  StpResolvedNetworkLoadBalancerReference
} from '@domain-services/config-manager/resolved-types/network-load-balancer';
import type { StpWorkloadType } from '@domain-services/config-manager/resolved-types/resources';
import { configManager as runtimeConfigManager, type ConfigManager } from '@domain-services/config-manager';
import { CliError } from '@utils/errors';
import { getPropsOfResourceReferencedInConfig } from './resource-references';
import type { ContainerWorkloadNetworkLoadBalancerIntegrationProps } from '@stacktape/config/events';
import { configErrors } from '../errors';

const validateListenerPortOverlap = ({ loadBalancer }: { loadBalancer: StpNetworkLoadBalancer }) => {
  const encounteredPorts = new Set<number>();
  loadBalancer.listeners.forEach(({ port }) => {
    if (encounteredPorts.has(port)) {
      throw new CliError({
        category: 'CONFIG_VALIDATION',
        code: 'CONFIG_NLB_LISTENER_PORT_DUPLICATE',
        message: `Network load balancer \`${loadBalancer.name}\` defines more than one listener on port \`${port}\`.`,
        hints: 'Each listener must use a unique port.'
      });
    }
    encounteredPorts.add(port);
  });
};

const validateNetworkLoadBalancerIntegrations = ({
  activeConfig,
  loadBalancerDefinition
}: {
  activeConfig: ConfigManager;
  loadBalancerDefinition: StpNetworkLoadBalancer;
}) => {
  loadBalancerDefinition.listeners.forEach(({ port }) => {
    const existingIntegrations = getAllIntegrationsForNetworkLoadBalancerListener({
      activeConfig,
      stpLoadBalancerName: loadBalancerDefinition.name,
      listenerPort: port
    });

    if (existingIntegrations.length !== 1) {
      throw configErrors.nlbListenerIntegrationCountInvalid({
        stpLoadBalancerName: loadBalancerDefinition.name,
        port,
        referencingWorkloadNames: existingIntegrations.map(({ workloadName }) => workloadName)
      });
    }
  });
};

export const validateNetworkLoadBalancerConfig = ({
  activeConfig,
  definition
}: {
  activeConfig: ConfigManager;
  definition: StpNetworkLoadBalancer;
}) => {
  if (
    definition.customDomains?.some(
      ({ disableDnsRecordCreation, customCertificateArn }) => disableDnsRecordCreation && !customCertificateArn
    )
  ) {
    throw configErrors.customCertificateRequiredWhenDnsDisabled({
      resourceName: definition.name,
      resourceType: definition.type
    });
  }

  validateListenerPortOverlap({ loadBalancer: definition });
  validateNetworkLoadBalancerIntegrations({ activeConfig, loadBalancerDefinition: definition });
};

export const resolveReferenceToNetworkLoadBalancer = (
  lbReference: ContainerWorkloadNetworkLoadBalancerIntegrationProps,
  referencedFrom: string,
  referencedFromType?: StpWorkloadType | 'alarm',
  activeConfig: ConfigManager = runtimeConfigManager
  // resolveListenerInfo = true
): StpResolvedNetworkLoadBalancerReference => {
  const referencedLoadBalancer = getPropsOfResourceReferencedInConfig({
    activeConfig,
    stpResourceReference: lbReference.loadBalancerName,
    stpResourceType: 'network-load-balancer',
    referencedFrom,
    referencedFromType
  });
  // if (resolveListenerInfo) {
  const referencedListener = referencedLoadBalancer?.listeners.find(({ port }) => port === lbReference.listenerPort);
  if (!referencedListener) {
    throw new CliError({
      category: 'CONFIG_VALIDATION',
      code: 'CONFIG_NLB_LISTENER_NOT_FOUND',
      message: `Network load balancer \`${referencedLoadBalancer.name}\` has no listener on port \`${lbReference.listenerPort}\`.`,
      hints: 'Set `listenerPort` to a port defined by the load balancer.'
    });
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
  activeConfig = runtimeConfigManager,
  stpLoadBalancerName,
  listenerPort
}: {
  activeConfig?: ConfigManager;
  stpLoadBalancerName: string;
  listenerPort: number;
}): (ContainerWorkloadNetworkLoadBalancerIntegrationProps & { workloadName: string })[] => {
  const result: (ContainerWorkloadNetworkLoadBalancerIntegrationProps & { workloadName: string })[] = [];
  activeConfig.allContainerWorkloads.forEach(({ containers, name }) =>
    containers.forEach(({ events }) => {
      if (events) {
        events.forEach((event) => {
          if (event.type === 'network-load-balancer') {
            const eventListenerPort =
              (event.properties as ContainerWorkloadNetworkLoadBalancerIntegrationProps).listenerPort || 443;
            if (
              resolveReferenceToNetworkLoadBalancer(event.properties, name, undefined, activeConfig).loadBalancer
                .name === stpLoadBalancerName &&
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
