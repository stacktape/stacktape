import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { configManager } from '@domain-services/config-manager';
import { filterResourcesForDevMode } from '../../../../commands/dev/dev-resource-filter';
import { resolveBucket } from '../buckets';

export const resolveHostingBuckets = async () => {
  const hostingBuckets = filterResourcesForDevMode(configManager.hostingBuckets);
  hostingBuckets.forEach(({ nameChain, _nestedResources: { bucket } }) => {
    resolveBucket({ definition: bucket });

    // due to parent hierarchy changes and backward compatibility we need to bring referenceable params and links from child resources to the parent
    const resource = calculatedStackOverviewManager.getStpResource({ nameChain });
    resource.referencableParams = {
      ...resource.referencableParams,
      ...(resource._nestedResources?.bucket?.referencableParams || {})
    };

    resource.links = {
      ...resource.links,
      ...(resource._nestedResources?.bucket?.links || {})
    };
  });
};
