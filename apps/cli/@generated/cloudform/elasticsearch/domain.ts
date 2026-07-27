import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AdvancedSecurityOptionsInput {
  AnonymousAuthEnabled?: Value<boolean>;
  Enabled?: Value<boolean>;
  InternalUserDatabaseEnabled?: Value<boolean>;
  MasterUserOptions?: MasterUserOptions;
  constructor(properties: AdvancedSecurityOptionsInput) {
    Object.assign(this, properties);
  }
}

export class CognitoOptions {
  Enabled?: Value<boolean>;
  IdentityPoolId?: Value<string>;
  RoleArn?: Value<string>;
  UserPoolId?: Value<string>;
  constructor(properties: CognitoOptions) {
    Object.assign(this, properties);
  }
}

export class ColdStorageOptions {
  Enabled?: Value<boolean>;
  constructor(properties: ColdStorageOptions) {
    Object.assign(this, properties);
  }
}

export class DomainEndpointOptions {
  CustomEndpoint?: Value<string>;
  CustomEndpointCertificateArn?: Value<string>;
  CustomEndpointEnabled?: Value<boolean>;
  EnforceHTTPS?: Value<boolean>;
  TLSSecurityPolicy?: Value<string>;
  constructor(properties: DomainEndpointOptions) {
    Object.assign(this, properties);
  }
}

export class EBSOptions {
  EBSEnabled?: Value<boolean>;
  Iops?: Value<number>;
  VolumeSize?: Value<number>;
  VolumeType?: Value<string>;
  constructor(properties: EBSOptions) {
    Object.assign(this, properties);
  }
}

export class ElasticsearchClusterConfig {
  ColdStorageOptions?: ColdStorageOptions;
  DedicatedMasterCount?: Value<number>;
  DedicatedMasterEnabled?: Value<boolean>;
  DedicatedMasterType?: Value<string>;
  InstanceCount?: Value<number>;
  InstanceType?: Value<string>;
  WarmCount?: Value<number>;
  WarmEnabled?: Value<boolean>;
  WarmType?: Value<string>;
  ZoneAwarenessConfig?: ZoneAwarenessConfig;
  ZoneAwarenessEnabled?: Value<boolean>;
  constructor(properties: ElasticsearchClusterConfig) {
    Object.assign(this, properties);
  }
}

export class EncryptionAtRestOptions {
  Enabled?: Value<boolean>;
  KmsKeyId?: Value<string>;
  constructor(properties: EncryptionAtRestOptions) {
    Object.assign(this, properties);
  }
}

export class LogPublishingOption {
  CloudWatchLogsLogGroupArn?: Value<string>;
  Enabled?: Value<boolean>;
  constructor(properties: LogPublishingOption) {
    Object.assign(this, properties);
  }
}

export class MasterUserOptions {
  MasterUserARN?: Value<string>;
  MasterUserName?: Value<string>;
  MasterUserPassword?: Value<string>;
  constructor(properties: MasterUserOptions) {
    Object.assign(this, properties);
  }
}

export class NodeToNodeEncryptionOptions {
  Enabled?: Value<boolean>;
  constructor(properties: NodeToNodeEncryptionOptions) {
    Object.assign(this, properties);
  }
}

export class SnapshotOptions {
  AutomatedSnapshotStartHour?: Value<number>;
  constructor(properties: SnapshotOptions) {
    Object.assign(this, properties);
  }
}

export class VPCOptions {
  SecurityGroupIds?: List<Value<string>>;
  SubnetIds?: List<Value<string>>;
  constructor(properties: VPCOptions) {
    Object.assign(this, properties);
  }
}

export class ZoneAwarenessConfig {
  AvailabilityZoneCount?: Value<number>;
  constructor(properties: ZoneAwarenessConfig) {
    Object.assign(this, properties);
  }
}
export interface DomainProperties {
  AccessPolicies?: { [key: string]: any };
  AdvancedOptions?: { [key: string]: Value<string> };
  AdvancedSecurityOptions?: AdvancedSecurityOptionsInput;
  CognitoOptions?: CognitoOptions;
  DomainEndpointOptions?: DomainEndpointOptions;
  DomainName?: Value<string>;
  EBSOptions?: EBSOptions;
  ElasticsearchClusterConfig?: ElasticsearchClusterConfig;
  ElasticsearchVersion?: Value<string>;
  EncryptionAtRestOptions?: EncryptionAtRestOptions;
  LogPublishingOptions?: { [key: string]: LogPublishingOption };
  NodeToNodeEncryptionOptions?: NodeToNodeEncryptionOptions;
  SnapshotOptions?: SnapshotOptions;
  Tags?: List<ResourceTag>;
  VPCOptions?: VPCOptions;
}
export default class Domain extends ResourceBase<DomainProperties> {
  static AdvancedSecurityOptionsInput = AdvancedSecurityOptionsInput;
  static CognitoOptions = CognitoOptions;
  static ColdStorageOptions = ColdStorageOptions;
  static DomainEndpointOptions = DomainEndpointOptions;
  static EBSOptions = EBSOptions;
  static ElasticsearchClusterConfig = ElasticsearchClusterConfig;
  static EncryptionAtRestOptions = EncryptionAtRestOptions;
  static LogPublishingOption = LogPublishingOption;
  static MasterUserOptions = MasterUserOptions;
  static NodeToNodeEncryptionOptions = NodeToNodeEncryptionOptions;
  static SnapshotOptions = SnapshotOptions;
  static VPCOptions = VPCOptions;
  static ZoneAwarenessConfig = ZoneAwarenessConfig;
  constructor(properties?: DomainProperties) {
    super('AWS::Elasticsearch::Domain', properties || {});
  }
}
