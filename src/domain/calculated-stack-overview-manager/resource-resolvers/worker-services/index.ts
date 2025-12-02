import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { configManager } from '@domain-services/config-manager';
import { resolveContainerWorkload } from '../multi-container-workloads';

export const resolveWorkerServices = async () => {
  const { workerServices } = configManager;
  if (workerServices.length) {
    // resolve web service container workloads
    workerServices.forEach(({ nameChain, _nestedResources: { containerWorkload } }) => {
      resolveContainerWorkload({ definition: containerWorkload });

      // due to parent hierarchy changes and backward compatibility we need to bring referenceable params and links from child resources to the parent
      const resource = calculatedStackOverviewManager.getStpResource({ nameChain });
      resource.referencableParams = {
        ...resource.referencableParams,
        ...(resource._nestedResources?.containerWorkload?.referencableParams || {})
      };
      resource.links = {
        ...resource.links,
        ...(resource._nestedResources?.containerWorkload?.links || {})
      };
    });
  }
};
