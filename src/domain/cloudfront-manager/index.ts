import { eventManager } from '@application-services/event-manager';
import { getCloudfrontDistributionConfigs } from '@domain-services/calculated-stack-overview-manager/resource-resolvers/_utils/cdn';
import { stackManager } from '@domain-services/cloudformation-stack-manager';
import { configManager } from '@domain-services/config-manager';
import { cfLogicalNames } from '@shared/naming/logical-names';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import compose from '@utils/basic-compose-shim';
import { cancelablePublicMethods, skipInitIfInitialized } from '@utils/decorators';

export class CloudfrontManager {
  init = async () => {
    //
  };

  invalidateCaches = async () => {
    await eventManager.startEvent({ eventType: 'INVALIDATE_CACHE', description: 'Invalidating CDN caches' });

    const stackResources = stackManager.existingStackResources;

    const invalidatedDistributionIds = await Promise.all(
      configManager.allResourcesWithCdnsToInvalidate
        .map((resourceWithCdn) => {
          if (!resourceWithCdn.cdn.customDomains?.length) {
            const distributionId = stackResources.find(
              ({ LogicalResourceId }) =>
                LogicalResourceId ===
                cfLogicalNames.cloudfrontDistribution(
                  (resourceWithCdn.configParentResourceType === 'nextjs-web'
                    ? configManager.findImmediateParent({ nameChain: resourceWithCdn.nameChain })
                    : resourceWithCdn
                  ).name,
                  0
                )
            )?.PhysicalResourceId;
            return distributionId ? [this.#invalidateCache({ distributionId, paths: ['/*'] })] : [];
          }
          return Object.values(getCloudfrontDistributionConfigs(resourceWithCdn)).map((_configuration, index) => {
            const distributionId = stackResources.find(
              ({ LogicalResourceId }) =>
                LogicalResourceId ===
                cfLogicalNames.cloudfrontDistribution(
                  (resourceWithCdn.configParentResourceType === 'nextjs-web'
                    ? configManager.findImmediateParent({ nameChain: resourceWithCdn.nameChain })
                    : resourceWithCdn
                  ).name,
                  index
                )
            )?.PhysicalResourceId;
            return distributionId ? this.#invalidateCache({ distributionId, paths: ['/*'] }) : [];
          });
        })
        .flat(2)
    );

    await eventManager.finishEvent({
      eventType: 'INVALIDATE_CACHE',
      data: { invalidatedDistributionIds },
      finalMessage: 'Invalidation has started but it might take few seconds until all edge locations are invalidated.'
    });
  };

  #invalidateCache = async ({ distributionId, paths }: { distributionId: string; paths: string[] }) => {
    return awsSdkManager.invalidateCloudfrontDistributionCache({ distributionId, invalidatePaths: paths });
  };
}

export const cloudfrontManager = compose(skipInitIfInitialized, cancelablePublicMethods)(new CloudfrontManager());
