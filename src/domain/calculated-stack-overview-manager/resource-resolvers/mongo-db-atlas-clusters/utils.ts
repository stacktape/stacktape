import type { IntrinsicFunction } from '@cloudform/dataTypes';
import type Resource from '@cloudform/resource';
import { globalStateManager } from '@application-services/global-state-manager';
import Route from '@cloudform/ec2/route';
import { GetAtt, Ref } from '@cloudform/functions';
import { configManager } from '@domain-services/config-manager';
import { getConnectToReferencesForResource } from '@domain-services/config-manager/utils/resource-references';
import { thirdPartyProviderManager } from '@domain-services/third-party-provider-credentials-manager';
import { vpcManager } from '@domain-services/vpc-manager';
import { awsResourceNames } from '@shared/naming/aws-resource-names';
import { cfLogicalNames } from '@shared/naming/logical-names';
import { transformToCidr } from '@shared/utils/misc';
import { ExpectedError } from '@utils/errors';
import { snakeCase } from 'change-case';
import { findBestFittingAvailableRegion } from '../_utils/regions';

const getAtlasVpcNetworkContainerCidrBlock = () =>
  vpcManager.getVpcCidr().startsWith('172.') ? '10.0.0.0/21' : '172.16.0.0/21';

export const getAtlasMongoProjectResource = () => {
  const atlasMongoProviderConfig = thirdPartyProviderManager.getAtlasMongoDbProviderConfig();
  const resourceType: SupportedMongoAtlasV1CfResourceType = 'MongoDB::StpAtlasV1::Project';
  return {
    Type: resourceType,
    Properties: {
      Name: awsResourceNames.atlasMongoProject(
        globalStateManager.targetStack.stackName,
        globalStateManager.targetStack.globallyUniqueStackHash
      ),
      OrgId: atlasMongoProviderConfig.organizationId,
      ApiKeys: {
        PublicKey: atlasMongoProviderConfig.publicKey,
        PrivateKey: atlasMongoProviderConfig.privateKey
      }
    }
  } as Resource;
};

export const getAtlasMongoNetworkContainerResource = () => {
  const atlasMongoProviderConfig = thirdPartyProviderManager.getAtlasMongoDbProviderConfig();
  const resourceType: SupportedMongoAtlasV1CfResourceType = 'MongoDB::StpAtlasV1::NetworkContainer';
  return {
    Type: resourceType,
    DependsOn: [cfLogicalNames.atlasMongoProject()],
    Properties: {
      ProjectId: Ref(cfLogicalNames.atlasMongoProject()),
      RegionName: snakeCase(globalStateManager.region).toUpperCase(),
      ProviderName: 'AWS',
      AtlasCidrBlock: getAtlasVpcNetworkContainerCidrBlock(),
      ApiKeys: {
        PublicKey: atlasMongoProviderConfig.publicKey,
        PrivateKey: atlasMongoProviderConfig.privateKey
      }
    }
  } as Resource;
};

export const getAtlasMongoNetworkPeeringResource = () => {
  const atlasMongoProviderConfig = thirdPartyProviderManager.getAtlasMongoDbProviderConfig();
  const resourceType: SupportedMongoAtlasV1CfResourceType = 'MongoDB::StpAtlasV1::NetworkPeering';
  return {
    Type: resourceType,
    DependsOn: [cfLogicalNames.atlasMongoProjectVpcNetworkContainer()],
    Properties: {
      ProjectId: Ref(cfLogicalNames.atlasMongoProject()),
      ContainerId: Ref(cfLogicalNames.atlasMongoProjectVpcNetworkContainer()),
      AccepterRegionName: globalStateManager.region, // snakeCase(configManager.region).toUpperCase(),
      AwsAccountId: globalStateManager.targetAwsAccount.awsAccountId,
      RouteTableCidrBlock: vpcManager.getVpcCidr(),
      VpcId: vpcManager.getVpcId(),
      ProviderName: 'AWS',
      ApiKeys: {
        PublicKey: atlasMongoProviderConfig.publicKey,
        PrivateKey: atlasMongoProviderConfig.privateKey
      }
    }
  } as Resource;
};

export const getAtlasMongoVpcRouteResource = (publicSubnetTable: boolean, subnetIndex: number) => {
  const route = new Route({
    RouteTableId: Ref(cfLogicalNames.routeTable(publicSubnetTable, subnetIndex)),
    DestinationCidrBlock: getAtlasVpcNetworkContainerCidrBlock(),
    VpcPeeringConnectionId: GetAtt(cfLogicalNames.atlasMongoProjectVpcNetworkPeering(), 'ConnectionId')
  });
  route.DependsOn = [cfLogicalNames.customResourceAcceptVpcPeerings()];
  return route;
};

export const getAtlasMongoProjectIpAccessList = () => {
  const atlasMongoProviderConfig = thirdPartyProviderManager.getAtlasMongoDbProviderConfig();
  const resourceType: SupportedMongoAtlasV1CfResourceType = 'MongoDB::StpAtlasV1::ProjectIpAccessList';
  const securityGroupsToAllowAccess = Array.from(
    new Set(
      configManager.atlasMongoClusters
        .map(({ nameChain }) => getConnectToReferencesForResource({ nameChain }))
        .flat()
        .map(({ scopingCfLogicalNameOfSecurityGroup }) => scopingCfLogicalNameOfSecurityGroup)
    )
  );
  const basicProjectIpAccessList: {
    AwsSecurityGroup?: string | IntrinsicFunction;
    CidrBlock?: string | IntrinsicFunction;
  }[] =
    atlasMongoProviderConfig.accessibility?.accessibilityMode === 'internet' || !atlasMongoProviderConfig.accessibility
      ? [{ CidrBlock: '0.0.0.0/0' }]
      : atlasMongoProviderConfig.accessibility?.accessibilityMode === 'vpc'
        ? [{ CidrBlock: vpcManager.getVpcCidr() }]
        : atlasMongoProviderConfig.accessibility?.accessibilityMode === 'scoping-workloads-in-vpc'
          ? securityGroupsToAllowAccess.map((cfLogicalNameOfSecurityGroup) => ({
              AwsSecurityGroup: Ref(cfLogicalNameOfSecurityGroup)
            })) || []
          : [];
  return {
    Type: resourceType,
    DependsOn: [cfLogicalNames.atlasMongoProject()],
    Properties: {
      ProjectId: Ref(cfLogicalNames.atlasMongoProject()),
      AccessList: basicProjectIpAccessList.concat(
        atlasMongoProviderConfig.accessibility?.whitelistedIps?.map((cidrOrIp) => ({
          CidrBlock: transformToCidr({ cidrOrIp })
        })) || []
      ),
      ApiKeys: {
        PublicKey: atlasMongoProviderConfig.publicKey,
        PrivateKey: atlasMongoProviderConfig.privateKey
      }
    }
  } as Resource;
};

const errorOnExistenceOfProperty = ({
  resource,
  stpResourceName,
  propertyName,
  minimalInstanceSizeSupportingProperty
}: {
  resource: StpMongoDbAtlasCluster;
  stpResourceName: string;
  propertyName: keyof StpMongoDbAtlasCluster;
  minimalInstanceSizeSupportingProperty: StpAtlasMongoGeneralTierClusterInstanceSize;
}) => {
  if (resource[propertyName]) {
    throw new ExpectedError(
      'CONFIG_VALIDATION',
      `Error in mongo-db-atlas-cluster "${stpResourceName}". Cluster of size ${resource.clusterTier} does not support usage of "${propertyName}" property.`,
      `Minimal cluster tier to support this property is "${minimalInstanceSizeSupportingProperty}".`
    );
  }
};

const ATLAS_MONGO_SHARED_TIER_REGIONS = [
  'us-east-1',
  'ap-southeast-1',
  'ap-south-1',
  'eu-west-1',
  'eu-central-1',
  'us-west-2',
  'ap-southeast-2',
  'ap-northeast-1',
  'eu-north-1',
  'me-south-1'
];

const findBestFittingRegionForMongoSharedTier = ({
  stackDeploymentRegion
}: {
  stackDeploymentRegion: string;
}): string => {
  return findBestFittingAvailableRegion(stackDeploymentRegion, ATLAS_MONGO_SHARED_TIER_REGIONS);
};

export const getAtlasMongoMasterUserResource = ({
  stpResourceName,
  resource
}: {
  stpResourceName: string;
  resource: StpMongoDbAtlasCluster;
}) => {
  const atlasMongoProviderConfig = thirdPartyProviderManager.getAtlasMongoDbProviderConfig();
  const resourceType: SupportedMongoAtlasV1CfResourceType = 'MongoDB::StpAtlasV1::DatabaseUser';
  return {
    Type: resourceType,
    DependsOn: [cfLogicalNames.atlasMongoCluster(stpResourceName)],
    Properties: {
      DatabaseName: 'admin',
      ProjectId: Ref(cfLogicalNames.atlasMongoProject()),
      Roles: [
        { RoleName: 'atlasAdmin', DatabaseName: 'admin' },
        { RoleName: 'readWriteAnyDatabase', DatabaseName: 'admin' }
      ],
      Scopes: [
        {
          Type: 'CLUSTER',
          Name: awsResourceNames.atlasMongoCluster(stpResourceName)
        }
      ],
      Username: resource.adminUserCredentials.userName,
      Password: resource.adminUserCredentials.password,
      ApiKeys: {
        PublicKey: atlasMongoProviderConfig.publicKey,
        PrivateKey: atlasMongoProviderConfig.privateKey
      }
    }
  } as Resource;
};

const getIsSharded = (resource: StpMongoDbAtlasCluster) => {
  return resource.numShards ? resource.numShards > 1 : false;
};

export const getAtlasMongoClusterResource = ({
  resource,
  stpResourceName
}: {
  resource: StpMongoDbAtlasCluster;
  stpResourceName: string;
}) => {
  const atlasMongoProviderConfig = thirdPartyProviderManager.getAtlasMongoDbProviderConfig();
  const resourceType: SupportedMongoAtlasV1CfResourceType = 'MongoDB::StpAtlasV1::Cluster';
  const isSharded = getIsSharded(resource);

  if (resource.clusterTier === 'M2' || resource.clusterTier === 'M5') {
    const propertiesToCheck: (keyof StpMongoDbAtlasCluster)[] = [
      'autoScaling',
      'biConnector',
      'enableBackups',
      'diskSizeGB',
      'replication',
      'enablePointInTimeRecovery'
    ];
    propertiesToCheck.forEach((propertyName) =>
      errorOnExistenceOfProperty({
        resource,
        propertyName,
        stpResourceName,
        minimalInstanceSizeSupportingProperty: 'M10'
      })
    );
    if (
      atlasMongoProviderConfig.accessibility?.accessibilityMode === 'vpc' ||
      atlasMongoProviderConfig.accessibility?.accessibilityMode === 'scoping-workloads-in-vpc'
    ) {
      throw new ExpectedError(
        'CONFIG_VALIDATION',
        `Error in mongo-db-atlas-cluster "${stpResourceName}". When using cluster instance sizes from shared tier (M2, M5) you cannot have "accessibilityMode" set to "${atlasMongoProviderConfig.accessibility?.accessibilityMode}"\n` +
          'This will make your cluster unreachable.',
        'Try setting property "accessibilityMode" in providerConfig.mongoDbConfig.accessibility to "internet".'
      );
    }
  }
  if (
    resource.clusterTier === 'M2' ||
    resource.clusterTier === 'M5' ||
    resource.clusterTier === 'M10' ||
    resource.clusterTier === 'M20'
  ) {
    const propertiesToCheck: (keyof StpMongoDbAtlasCluster)[] = ['numShards'];
    propertiesToCheck.forEach((propertyName) =>
      errorOnExistenceOfProperty({
        resource,
        propertyName,
        stpResourceName,
        minimalInstanceSizeSupportingProperty: 'M30'
      })
    );
  }
  if (resource.enablePointInTimeRecovery && !resource.enableBackups) {
    throw new ExpectedError(
      'CONFIG_VALIDATION',
      `Error in mongo-db-atlas-cluster "${stpResourceName}". You can't enable point in time recovery without enabling backups.`
    );
  }
  if (
    resource.biConnector?.enabled &&
    resource.biConnector?.readPreference === 'analytics' &&
    (resource?.replication?.numAnalyticsNodes || 0) < 1
  ) {
    throw new ExpectedError(
      'CONFIG_VALIDATION',
      `Error in mongo-db-atlas-cluster "${stpResourceName}". When using read preference "${resource.biConnector?.readPreference}" for biConnector, you must set at least one analytics node in "replicationSpecs".`
    );
  }
  return {
    Type: resourceType,
    DependsOn: !(resource.clusterTier === 'M2' || resource.clusterTier === 'M5')
      ? [cfLogicalNames.atlasMongoProjectVpcNetworkContainer()]
      : [],
    Properties: {
      ProjectId: Ref(cfLogicalNames.atlasMongoProject()),
      AutoScaling: !(resource.clusterTier === 'M2' || resource.clusterTier === 'M5')
        ? {
            Compute: resource.autoScaling && {
              Enabled: !!(resource.autoScaling.minClusterTier || resource.autoScaling.maxClusterTier),
              ScaleDownEnabled:
                !!(resource.autoScaling.minClusterTier || resource.autoScaling.maxClusterTier) &&
                !resource.autoScaling.disableScaleDown
            },
            DiskGBEnabled: !resource.autoScaling?.disableDiskScaling
          }
        : undefined,
      BiConnector: resource.biConnector && {
        ReadPreference: resource.biConnector.readPreference,
        Enabled: resource.biConnector.enabled
      },
      ClusterType: isSharded ? 'SHARDED' : 'REPLICASET',
      DiskSizeGB: resource.diskSizeGB,
      MongoDBMajorVersion: resource.version || '7.0',
      Name: awsResourceNames.atlasMongoCluster(stpResourceName),
      NumShards: resource.numShards || 1,
      PitEnabled: resource.enablePointInTimeRecovery,
      ProviderBackupEnabled: resource.enableBackups,
      ProviderSettings: {
        ProviderName: !(resource.clusterTier === 'M2' || resource.clusterTier === 'M5') ? 'AWS' : 'TENANT',
        BackingProviderName: resource.clusterTier === 'M2' || resource.clusterTier === 'M5' ? 'AWS' : undefined,
        InstanceSizeName: resource.clusterTier,
        RegionName: snakeCase(
          resource.clusterTier === 'M2' || resource.clusterTier === 'M5'
            ? findBestFittingRegionForMongoSharedTier({ stackDeploymentRegion: globalStateManager.region })
            : globalStateManager.region
        ).toUpperCase(),
        AutoScaling: resource.autoScaling &&
          (resource.autoScaling.minClusterTier || resource.autoScaling.maxClusterTier) && {
            Compute: {
              minClusterTier: resource.autoScaling.minClusterTier || resource.clusterTier,
              maxClusterTier: resource.autoScaling.maxClusterTier || resource.clusterTier
            }
          }
      },
      ReplicationSpecs: resource.replication && [
        {
          ID: 'repset',
          NumShards: resource.numShards || 1,
          RegionsConfig: [
            {
              RegionName: snakeCase(globalStateManager.region).toUpperCase(),
              AnalyticsNodes: resource.replication.numAnalyticsNodes || 0,
              ElectableNodes: resource.replication.numElectableNodes || 3,
              ReadOnlyNodes: resource.replication.numReadOnlyNodes || 0,
              Priority: 7
            }
          ]
        }
      ],
      ApiKeys: {
        PublicKey: atlasMongoProviderConfig.publicKey,
        PrivateKey: atlasMongoProviderConfig.privateKey
      }
    }
  } as Resource;
};
