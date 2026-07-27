import { GetAtt, Join } from '@cloudform/functions';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { configManager } from '@domain-services/config-manager';
import { filterResourcesForDevMode } from '../../../../commands/dev/dev-resource-filter';
import { cfLogicalNames } from '@shared/naming/logical-names';
import { getSimpleServiceDefaultContainerName } from '@shared/naming/utils';
import { resolveApplicationLoadBalancer } from '../application-load-balancers';
import { resolveContainerWorkload } from '../multi-container-workloads';

export const resolvePrivateServices = async () => {
  const privateServices = filterResourcesForDevMode(configManager.privateServices);
  if (privateServices.length) {
    // resolve web service container workloads
    privateServices.forEach(({ nameChain, _nestedResources: { containerWorkload, loadBalancer } }) => {
      resolveContainerWorkload({ definition: containerWorkload });
      const serviceConnectEvent = containerWorkload.containers
        .find(({ name }) => name === getSimpleServiceDefaultContainerName())
        .events?.find(({ type }) => type === 'service-connect') as ContainerWorkloadServiceConnectIntegration;
      if (serviceConnectEvent) {
        calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
          nameChain: containerWorkload.nameChain,
          paramName: 'address',
          paramValue: `${serviceConnectEvent.properties.alias}:${serviceConnectEvent.properties.containerPort}`
        });
      }
      if (loadBalancer) {
        resolveApplicationLoadBalancer({ definition: loadBalancer });
        // we are also adding URL parameter (which is not by default added on load balancer)
        calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
          nameChain: loadBalancer.nameChain,
          paramName: 'address',
          paramValue: Join(':', [
            GetAtt(cfLogicalNames.loadBalancer(loadBalancer.name), 'DNSName'),
            `${loadBalancer.listeners[0].port}`
          ]),
          showDuringPrint: true
        });
      }
      // due to parent hierarchy changes and backward compatibility we need to bring referenceable params and links from child resources to the parent
      const resource = calculatedStackOverviewManager.getStpResource({ nameChain });
      resource.referencableParams = {
        ...resource.referencableParams,
        ...(resource._nestedResources?.containerWorkload?.referencableParams || {}),
        ...(resource._nestedResources?.loadBalancer?.referencableParams || {})
      };
      resource.links = {
        ...resource.links,
        ...(resource._nestedResources?.containerWorkload?.links || {}),
        ...(resource._nestedResources?.loadBalancer?.links || {})
      };
      resource.outputs = {
        ...resource.outputs,
        ...(resource._nestedResources?.containerWorkload?.outputs || {}),
        ...(resource._nestedResources?.loadBalancer?.outputs || {})
      };
    });
  }
};
