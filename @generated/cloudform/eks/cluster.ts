import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AccessConfig {
  AuthenticationMode?: Value<string>;
  BootstrapClusterCreatorAdminPermissions?: Value<boolean>;
  constructor(properties: AccessConfig) {
    Object.assign(this, properties);
  }
}

export class BlockStorage {
  Enabled?: Value<boolean>;
  constructor(properties: BlockStorage) {
    Object.assign(this, properties);
  }
}

export class ClusterLogging {
  EnabledTypes?: List<LoggingTypeConfig>;
  constructor(properties: ClusterLogging) {
    Object.assign(this, properties);
  }
}

export class ComputeConfig {
  NodePools?: List<Value<string>>;
  NodeRoleArn?: Value<string>;
  Enabled?: Value<boolean>;
  constructor(properties: ComputeConfig) {
    Object.assign(this, properties);
  }
}

export class ControlPlanePlacement {
  GroupName?: Value<string>;
  constructor(properties: ControlPlanePlacement) {
    Object.assign(this, properties);
  }
}

export class ElasticLoadBalancing {
  Enabled?: Value<boolean>;
  constructor(properties: ElasticLoadBalancing) {
    Object.assign(this, properties);
  }
}

export class EncryptionConfig {
  Resources?: List<Value<string>>;
  Provider?: Provider;
  constructor(properties: EncryptionConfig) {
    Object.assign(this, properties);
  }
}

export class KubernetesNetworkConfig {
  ServiceIpv4Cidr?: Value<string>;
  ServiceIpv6Cidr?: Value<string>;
  IpFamily?: Value<string>;
  ElasticLoadBalancing?: ElasticLoadBalancing;
  constructor(properties: KubernetesNetworkConfig) {
    Object.assign(this, properties);
  }
}

export class Logging {
  ClusterLogging?: ClusterLogging;
  constructor(properties: Logging) {
    Object.assign(this, properties);
  }
}

export class LoggingTypeConfig {
  Type?: Value<string>;
  constructor(properties: LoggingTypeConfig) {
    Object.assign(this, properties);
  }
}

export class OutpostConfig {
  OutpostArns!: List<Value<string>>;
  ControlPlanePlacement?: ControlPlanePlacement;
  ControlPlaneInstanceType!: Value<string>;
  constructor(properties: OutpostConfig) {
    Object.assign(this, properties);
  }
}

export class Provider {
  KeyArn?: Value<string>;
  constructor(properties: Provider) {
    Object.assign(this, properties);
  }
}

export class RemoteNetworkConfig {
  RemoteNodeNetworks!: List<RemoteNodeNetwork>;
  RemotePodNetworks?: List<RemotePodNetwork>;
  constructor(properties: RemoteNetworkConfig) {
    Object.assign(this, properties);
  }
}

export class RemoteNodeNetwork {
  Cidrs!: List<Value<string>>;
  constructor(properties: RemoteNodeNetwork) {
    Object.assign(this, properties);
  }
}

export class RemotePodNetwork {
  Cidrs!: List<Value<string>>;
  constructor(properties: RemotePodNetwork) {
    Object.assign(this, properties);
  }
}

export class ResourcesVpcConfig {
  EndpointPublicAccess?: Value<boolean>;
  PublicAccessCidrs?: List<Value<string>>;
  EndpointPrivateAccess?: Value<boolean>;
  SecurityGroupIds?: List<Value<string>>;
  SubnetIds!: List<Value<string>>;
  constructor(properties: ResourcesVpcConfig) {
    Object.assign(this, properties);
  }
}

export class StorageConfig {
  BlockStorage?: BlockStorage;
  constructor(properties: StorageConfig) {
    Object.assign(this, properties);
  }
}

export class UpgradePolicy {
  SupportType?: Value<string>;
  constructor(properties: UpgradePolicy) {
    Object.assign(this, properties);
  }
}

export class ZonalShiftConfig {
  Enabled?: Value<boolean>;
  constructor(properties: ZonalShiftConfig) {
    Object.assign(this, properties);
  }
}
export interface ClusterProperties {
  Logging?: Logging;
  ComputeConfig?: ComputeConfig;
  Force?: Value<boolean>;
  StorageConfig?: StorageConfig;
  BootstrapSelfManagedAddons?: Value<boolean>;
  DeletionProtection?: Value<boolean>;
  ZonalShiftConfig?: ZonalShiftConfig;
  AccessConfig?: AccessConfig;
  EncryptionConfig?: List<EncryptionConfig>;
  KubernetesNetworkConfig?: KubernetesNetworkConfig;
  RoleArn: Value<string>;
  Name?: Value<string>;
  UpgradePolicy?: UpgradePolicy;
  RemoteNetworkConfig?: RemoteNetworkConfig;
  Version?: Value<string>;
  OutpostConfig?: OutpostConfig;
  Tags?: List<ResourceTag>;
  ResourcesVpcConfig: ResourcesVpcConfig;
}
export default class Cluster extends ResourceBase<ClusterProperties> {
  static AccessConfig = AccessConfig;
  static BlockStorage = BlockStorage;
  static ClusterLogging = ClusterLogging;
  static ComputeConfig = ComputeConfig;
  static ControlPlanePlacement = ControlPlanePlacement;
  static ElasticLoadBalancing = ElasticLoadBalancing;
  static EncryptionConfig = EncryptionConfig;
  static KubernetesNetworkConfig = KubernetesNetworkConfig;
  static Logging = Logging;
  static LoggingTypeConfig = LoggingTypeConfig;
  static OutpostConfig = OutpostConfig;
  static Provider = Provider;
  static RemoteNetworkConfig = RemoteNetworkConfig;
  static RemoteNodeNetwork = RemoteNodeNetwork;
  static RemotePodNetwork = RemotePodNetwork;
  static ResourcesVpcConfig = ResourcesVpcConfig;
  static StorageConfig = StorageConfig;
  static UpgradePolicy = UpgradePolicy;
  static ZonalShiftConfig = ZonalShiftConfig;
  constructor(properties: ClusterProperties) {
    super('AWS::EKS::Cluster', properties);
  }
}
