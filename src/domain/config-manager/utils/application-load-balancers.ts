import { stpErrors } from '@errors';
import { ExpectedError } from '@utils/errors';
import { configManager } from '../index';
import { getPropsOfResourceReferencedInConfig } from './resource-references';

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
        throw stpErrors.e44({
          stpLoadBalancerName: referencedLoadBalancer.name,
          referencedFrom,
          referencedFromType
        });
      }
      const referencedListener = referencedLoadBalancer?.listeners.find(
        ({ port }) => port === lbReference.listenerPort
      );
      if (!referencedListener) {
        throw stpErrors.e45({
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
      throw stpErrors.e46({
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
  loadBalancerDefinition: StpApplicationLoadBalancer;
}) => {
  loadBalancerDefinition.listeners.forEach(({ port }) => {
    const uniquePriorities: { [uniquePriority: number]: string } = {};
    getAllIntegrationsForApplicationLoadBalancerListener({
      stpLoadBalancerName: loadBalancerDefinition.name,
      listenerPort: port
    }).forEach(({ workloadName, priority }) => {
      if (uniquePriorities[priority]) {
        throw stpErrors.e93({
          stpApplicationLoadBalancerName: loadBalancerDefinition.name,
          stpResourceName1: workloadName,
          stpResourceName2: uniquePriorities[priority]
        });
      }
      uniquePriorities[priority] = workloadName;
    });
  });
};

export const transformLoadBalancerToListenerForm = ({ definition }: { definition: StpApplicationLoadBalancer }) => {
  let finalDefinition = definition;
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
  if (!definition.listeners?.length) {
    finalDefinition = {
      ...definition,
      listeners:
        // (definition.useHttps
        [
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
        ]
          // : [
          //     {
          //       port: 80,
          //       protocol: 'HTTP'
          //     }
          //   ]
          .concat(
            createTestListener ? [{ port: DEFAULT_TEST_LISTENER_PORT, protocol: 'HTTPS' }] : []
          ) as ApplicationLoadBalancerListener[]
    };
  }
  return finalDefinition;
};

const validateListenerPortOverlap = ({ loadBalancer }: { loadBalancer: StpApplicationLoadBalancer }) => {
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

export const validateApplicationLoadBalancerConfig = ({ definition }: { definition: StpApplicationLoadBalancer }) => {
  // if (definition.listeners?.length && definition.useHttps !== undefined) {
  //   throw stpErrors.e42({ stpLoadBalancerName: definition.name });
  // }
  // if (definition.useHttps && !definition.customDomains?.length) {
  //   throw stpErrors.e43({ stpLoadBalancerName: definition.name });
  // }

  const finalDefinition = transformLoadBalancerToListenerForm({ definition });

  validateListenerPortOverlap({ loadBalancer: finalDefinition });
  // we do this validations here, even though strictly speaking this is more about event integrations than load balancer itself
  // it is still related to load balancer so it should make sense :D
  validateApplicationLoadBalancerIntegrations({ loadBalancerDefinition: finalDefinition });
};
