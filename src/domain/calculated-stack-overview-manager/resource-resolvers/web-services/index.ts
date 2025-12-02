import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { configManager } from '@domain-services/config-manager';
import { domainManager } from '@domain-services/domain-manager';
import { resolveApplicationLoadBalancer } from '../application-load-balancers';
import { resolveHttpApiGateway } from '../http-api-gateways';
import { resolveContainerWorkload } from '../multi-container-workloads';
import { resolveNetworkLoadBalancer } from '../network-load-balancers';

export const resolveWebServices = async () => {
  const { webServices } = configManager;

  // resolve web service container workloads
  webServices.forEach(
    ({
      nameChain,
      customDomains,
      _nestedResources: { containerWorkload, httpApiGateway, loadBalancer, networkLoadBalancer }
    }) => {
      resolveContainerWorkload({ definition: containerWorkload });
      if (httpApiGateway) {
        resolveHttpApiGateway(httpApiGateway);
      }
      if (loadBalancer) {
        resolveApplicationLoadBalancer({ definition: loadBalancer });
        calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
          nameChain: loadBalancer.nameChain,
          paramName: 'url',
          paramValue: customDomains?.length
            ? `https://${customDomains[0].domainName}`
            : `https://${domainManager.getDefaultDomainForResource({ stpResourceName: loadBalancer.name })}`,
          showDuringPrint: true
        });
      }
      if (networkLoadBalancer) {
        resolveNetworkLoadBalancer({ definition: networkLoadBalancer });
        calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
          nameChain: networkLoadBalancer.nameChain,
          paramName: 'domain',
          paramValue: customDomains?.length
            ? `${customDomains[0].domainName}`
            : `${domainManager.getDefaultDomainForResource({ stpResourceName: networkLoadBalancer.name })}`,
          showDuringPrint: true
        });
      }
      // due to parent hierarchy changes and backward compatibility we need to bring referenceable params and links from child resources to the parent
      const resource = calculatedStackOverviewManager.getStpResource({ nameChain });
      resource.referencableParams = {
        ...(resource._nestedResources?.containerWorkload?.referencableParams || {}),
        ...(resource._nestedResources?.loadBalancer?.referencableParams || {}),
        ...(resource._nestedResources?.networkLoadBalancer?.referencableParams || {}),
        ...(resource._nestedResources?.httpApiGateway?.referencableParams || {}),
        ...resource.referencableParams
      };
      resource.links = {
        ...(resource._nestedResources?.containerWorkload?.links || {}),
        ...(resource._nestedResources?.loadBalancer?.links || {}),
        ...(resource._nestedResources?.networkLoadBalancer?.links || {}),
        ...(resource._nestedResources?.httpApiGateway?.links || {}),
        ...resource.links
      };
    }
  );
};
