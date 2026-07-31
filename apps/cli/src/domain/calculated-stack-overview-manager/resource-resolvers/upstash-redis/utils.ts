import type { SupportedUpstashRedisV1ResourceType } from '@domain-services/cloudformation-registry-manager/types';
import type { StpUpstashRedis } from '@domain-services/config-manager/resolved-types/upstash-redis';
import type Resource from '@cloudform/resource';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { thirdPartyProviderManager } from '@domain-services/third-party-provider-credentials-manager';
import { awsResourceNames } from '@stacktape/naming/aws-resource-names';
import { findBestFittingAvailableRegion } from '../_utils/regions';

export const getUpstashDatabaseResource = (resource: StpUpstashRedis) => {
  const upstashProvider = thirdPartyProviderManager.getUpstashProviderConfig();

  const resourceType: SupportedUpstashRedisV1ResourceType = 'Upstash::DatabasesV1::Database';
  return {
    Type: resourceType,
    Properties: {
      DatabaseName: awsResourceNames.upstashRedisDatabase({
        stpResourceName: resource.name,
        globallyUniqueStackHash: calculatedStackOverviewManager.context.globallyUniqueStackHash,
        stackName: calculatedStackOverviewManager.context.stackName
      }),
      Region: findBestFittingRegionForUpstashDatabase({
        stackDeploymentRegion: calculatedStackOverviewManager.context.region
      }),
      EvictionEnabled: resource.enableEviction,
      ApiCredentials: {
        Email: upstashProvider.accountEmail,
        Key: upstashProvider.apiKey
      }
    }
  } as Resource;
};

const UPSTASH_REDIS_AVAILABLE_REGIONS = [
  'us-east-1',
  'us-west-1',
  'us-west-2',
  'eu-west-1',
  'eu-central-1',
  'ap-southeast-1',
  'ap-southeast-2',
  'sa-east-1'
];

const findBestFittingRegionForUpstashDatabase = ({
  stackDeploymentRegion
}: {
  stackDeploymentRegion: string;
}): string => {
  return findBestFittingAvailableRegion(stackDeploymentRegion, UPSTASH_REDIS_AVAILABLE_REGIONS);
};
