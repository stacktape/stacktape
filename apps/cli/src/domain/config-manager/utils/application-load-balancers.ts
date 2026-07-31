import type {
  StpApplicationLoadBalancer,
  StpResolvedLoadBalancerReference
} from '@domain-services/config-manager/resolved-types/application-load-balancers';
import type { StpWorkloadType } from '@domain-services/config-manager/resolved-types/resources';
import { CliError } from '@utils/errors';
import { configManager } from '../index';
import { getPropsOfResourceReferencedInConfig } from './resource-references';
import type { ApplicationLoadBalancerListener } from '@stacktape/config/application-load-balancers';
import { configErrors } from '../errors';
import type {
  ApplicationLoadBalancerIntegrationProps,
  ContainerWorkloadLoadBalancerIntegrationProps
} from '@stacktape/config/events';

export const DEFAULT_TEST_LISTENER_PORT = 8080;

export const resolveReferenceToApplicationLoadBalancer = (
  lbReference: ApplicationLoadBalancerIntegrationProps | ContainerWorkloadLoadBalancerIntegrationProps,
  referencedFrom: string,
  referencedFromType?: StpWorkloadType | 'alarm',
  resolveListenerInfo = true
): StpResolvedLoadBalancerReference => {
  const referencedLoadBalancer = getPropsOfResourceReferencedInConfig({
    stpResourceReference: lbReference.loadBalancerName,
    stpResourceType: 'application-load-balancer',
    referencedFrom,
    referencedFromType
  });
  if (resolveListenerInfo) {
    if (lbReference.listenerPort !== undefined) {
      // if there are no custom listeners while listenerPort is specified - throw error
      if (!referencedLoadBalancer?.listeners?.length) {
        throw configErrors.listenerPortWithoutCustomListeners({
          stpLoadBalancerName: referencedLoadBalancer.name,
          referencedFrom,
          referencedFromType
        });
      }
      const referencedListener = referencedLoadBalancer?.listeners.find(
        ({ port }) => port === lbReference.listenerPort
      );
      if (!referencedListener) {
        throw configErrors.listenerNotFound({
          stpLoadBalancerName: referencedLoadBalancer.name,
          referencedFrom,
          referencedFromType,
          listenerPort: lbReference.listenerPort
        });
      }
      return {
        // target container set to 0 just to be compliant with every case
        // in case targetContainerPort is actually present in "lbReference" this reference gets overwritten
        containerPort: 0,
        ...lbReference,
        loadBalancer: referencedLoadBalancer,
        protocol: referencedListener.protocol,
        listenerHasCustomCerts: Boolean(referencedListener.customCertificateArns?.length)
      } as StpResolvedLoadBalancerReference;
    }
    // if listenerPort is not specified but the load balancer has custom listeners - throw error
    // console.log(referencedLoadBalancer.listeners?.length, !!referencedLoadBalancer.listeners?.length);
    if (referencedLoadBalancer.listeners?.length) {
      throw configErrors.listenerPortRequired({
        stpLoadBalancerName: referencedLoadBalancer.name,
        referencedFrom,
        referencedFromType
      });
    }
  }
  // resolving for load balancers which have only default listeners
  return {
    // target container set to 0 just to be compliant with every case
    // in case targetContainerPort is actually present in "lbReference" this reference gets overwritten
    containerPort: 0,
    ...lbReference,
    loadBalancer: referencedLoadBalancer,
    listenerPort: 443,
    protocol: 'HTTPS',
    listenerHasCustomCerts: false
  };
};

export const getAllIntegrationsForApplicationLoadBalancerListener = ({
  stpLoadBalancerName,
  listenerPort
}: {
  stpLoadBalancerName: string;
  listenerPort: number;
}): (ApplicationLoadBalancerIntegrationProps & { workloadName: string })[] => {
  const result: (ApplicationLoadBalancerIntegrationProps & { workloadName: string })[] = [];
  configManager.allLambdasTriggerableUsingEvents.forEach(({ events, name }) => {
    if (events) {
      events.forEach((event) => {
        const eventListenerPort = (event.properties as ApplicationLoadBalancerIntegrationProps).listenerPort || 443;
        if (
          event.type === 'application-load-balancer' &&
          resolveReferenceToApplicationLoadBalancer(event.properties, name).loadBalancer.name === stpLoadBalancerName &&
          eventListenerPort === listenerPort
        ) {
          result.push({ ...event.properties, listenerPort: eventListenerPort, workloadName: name });
        }
      });
    }
  });
  configManager.allContainerWorkloads.forEach(({ containers, name }) =>
    containers.forEach(({ events }) => {
      if (events) {
        events.forEach((event) => {
          const eventListenerPort = (event.properties as ApplicationLoadBalancerIntegrationProps).listenerPort || 443;
          if (
            event.type === 'application-load-balancer' &&
            resolveReferenceToApplicationLoadBalancer(event.properties, name).loadBalancer.name ===
              stpLoadBalancerName &&
            eventListenerPort === listenerPort
          ) {
            result.push({ ...event.properties, listenerPort: eventListenerPort, workloadName: name });
          }
        });
      }
    })
  );
  return result;
};

const validateApplicationLoadBalancerIntegrations = ({
  loadBalancerDefinition
}: {
  loadBalancerDefinition: ApplicationLoadBalancerWithListeners;
}) => {
  loadBalancerDefinition.listeners.forEach(({ port }) => {
    const uniquePriorities: { [uniquePriority: number]: string } = {};
    getAllIntegrationsForApplicationLoadBalancerListener({
      stpLoadBalancerName: loadBalancerDefinition.name,
      listenerPort: port
    }).forEach(({ workloadName, priority }) => {
      if (uniquePriorities[priority]) {
        throw configErrors.albPriorityConflict({
          stpApplicationLoadBalancerName: loadBalancerDefinition.name,
          stpResourceName1: workloadName,
          stpResourceName2: uniquePriorities[priority]
        });
      }
      uniquePriorities[priority] = workloadName;
    });
  });
};

/**
 * A load balancer whose listeners are settled: either the user authored some, or
 * {@link transformLoadBalancerToListenerForm} supplied the defaults. Listeners stay optional on the authored
 * definition, which is why everything downstream of that transform works with this shape instead.
 */
export type ApplicationLoadBalancerWithListeners = StpApplicationLoadBalancer & {
  listeners: ApplicationLoadBalancerListener[];
};

const hasAuthoredListeners = (
  definition: StpApplicationLoadBalancer
): definition is ApplicationLoadBalancerWithListeners => Boolean(definition.listeners?.length);

export const transformLoadBalancerToListenerForm = ({
  definition
}: {
  definition: StpApplicationLoadBalancer;
}): ApplicationLoadBalancerWithListeners => {
  // Resolved unconditionally: the traversal reports invalid load balancer references even for a definition that
  // brings its own listeners and therefore needs no test listener.
  const createTestListener = configManager.allContainerWorkloads.some(
    (cw) =>
      cw.deployment?.beforeAllowTrafficFunction &&
      cw.containers.some(({ events }) =>
        events.some(
          ({ properties, type }) =>
            type === 'application-load-balancer' &&
            resolveReferenceToApplicationLoadBalancer(properties, cw.name).loadBalancer.name === definition.name
        )
      )
  );
  if (hasAuthoredListeners(definition)) {
    return definition;
  }
  // (definition.useHttps
  const defaultListeners: ApplicationLoadBalancerListener[] = [
    {
      port: 80,
      protocol: 'HTTP',
      defaultAction: {
        type: 'redirect',
        properties: { statusCode: 'HTTP_301', protocol: 'HTTPS' }
      }
    },
    {
      port: 443,
      protocol: 'HTTPS'
    }
  ];
  // : [
  //     {
  //       port: 80,
  //       protocol: 'HTTP'
  //     }
  //   ]
  const testListeners: ApplicationLoadBalancerListener[] = createTestListener
    ? [{ port: DEFAULT_TEST_LISTENER_PORT, protocol: 'HTTPS' }]
    : [];
  return { ...definition, listeners: defaultListeners.concat(testListeners) };
};

const validateListenerPortOverlap = ({ loadBalancer }: { loadBalancer: ApplicationLoadBalancerWithListeners }) => {
  const encounteredPorts = new Set<number>();
  loadBalancer.listeners.forEach(({ port }) => {
    if (encounteredPorts.has(port)) {
      throw new CliError({
        category: 'CONFIG_VALIDATION',
        code: 'CONFIG_ALB_LISTENER_PORT_DUPLICATE',
        message: `Application load balancer \`${loadBalancer.name}\` defines more than one listener on port \`${port}\`.`,
        hints: 'Each listener must use a unique port.'
      });
    }
    encounteredPorts.add(port);
  });
};

export const validateApplicationLoadBalancerConfig = ({ definition }: { definition: StpApplicationLoadBalancer }) => {
  const finalDefinition = transformLoadBalancerToListenerForm({ definition });

  if (
    finalDefinition.customDomains?.some(
      ({ disableDnsRecordCreation, customCertificateArn }) => disableDnsRecordCreation && !customCertificateArn
    )
  ) {
    throw configErrors.customCertificateRequiredWhenDnsDisabled({
      resourceName: finalDefinition.name,
      resourceType: finalDefinition.type
    });
  }

  validateListenerPortOverlap({ loadBalancer: finalDefinition });
  // we do this validations here, even though strictly speaking this is more about event integrations than load balancer itself
  // it is still related to load balancer so it should make sense :D
  validateApplicationLoadBalancerIntegrations({ loadBalancerDefinition: finalDefinition });
};
