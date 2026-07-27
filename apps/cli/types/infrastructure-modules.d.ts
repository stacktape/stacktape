type StpCfInfrastructureModuleType = 'atlasMongo' | 'upstashRedis' | 'ecsBlueGreen';

type SupportedUpstashRedisV1ResourceType = 'Upstash::DatabasesV1::Database';

type SupportedEcsBlueGreenV1ResourceType = 'Stacktape::ECSBlueGreenV1::Service';

type SupportedMongoAtlasV1CfResourceType =
  | 'MongoDB::StpAtlasV1::Project'
  | 'MongoDB::StpAtlasV1::NetworkPeering'
  | 'MongoDB::StpAtlasV1::NetworkContainer'
  | 'MongoDB::StpAtlasV1::ProjectIpAccessList'
  | 'MongoDB::StpAtlasV1::EncryptionAtRest'
  | 'MongoDB::StpAtlasV1::DatabaseUser'
  | 'MongoDB::StpAtlasV1::Cluster';

// just to understand the extensibility
type SupportedPrivateCfResourceType =
  | SupportedMongoAtlasV1CfResourceType
  | SupportedUpstashRedisV1ResourceType
  | SupportedEcsBlueGreenV1ResourceType;

interface CfInfrastructureModuleData {
  readonly type: StpCfInfrastructureModuleType;
  // changing this parameter is braking change.
  // before updating stack (if the stack is already using this module) it is necessary to
  // compare major module version used by stack and major module version used by this stacktape version.
  // If they do not match, update will require resource replacements.
  // in ideal world, we can stay at V1 for years
  readonly privateTypesMajorVersionUsed: string;
  // in cloudformation registry WE ARE DETERMINING THE SUBVERSION based on "Description" property of private type
  // !!! every private type in a release should have same correct subversion (corresponding to the release) in its description
  // !!! each release of privateTypes should contain all privateTypes listed in privateTypesSpecs
  readonly privateTypesMinimalRequiredSubversion: string;
  // over time privateTypes should ONLY BE ADDED to this "list", NEVER REMOVED !!!
  // removing privateType might introduce BREAKING CHANGE therefore this should be done only when upgrading "privateTypesMajorVersionUsed"
  // in cloudformation registry WE ARE DETERMINING THE SUBVERSION based on "Description" property of private type
  // !!! every private type in a release should have correct subversion in its description
  // !!! each release of privateTypes should contain all privateTypes listed in privateTypesSpecs
  readonly privateTypesSpecs: {
    [privateTypeName in SupportedPrivateCfResourceType]?: { packagePrefix: string };
  };
}

type CloudformationPrivateTypeFile = { fileName: string };
