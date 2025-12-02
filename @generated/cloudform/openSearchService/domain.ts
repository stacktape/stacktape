import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AdvancedSecurityOptionsInput {
  IAMFederationOptions?: IAMFederationOptions;
  AnonymousAuthEnabled?: Value<boolean>;
  InternalUserDatabaseEnabled?: Value<boolean>;
  SAMLOptions?: SAMLOptions;
  Enabled?: Value<boolean>;
  JWTOptions?: JWTOptions;
  AnonymousAuthDisableDate?: Value<string>;
  MasterUserOptions?: MasterUserOptions;
  constructor(properties: AdvancedSecurityOptionsInput) {
    Object.assign(this, properties);
  }
}

export class ClusterConfig {
  MultiAZWithStandbyEnabled?: Value<boolean>;
  DedicatedMasterEnabled?: Value<boolean>;
  ZoneAwarenessConfig?: ZoneAwarenessConfig;
  ColdStorageOptions?: ColdStorageOptions;
  NodeOptions?: List<NodeOption>;
  WarmType?: Value<string>;
  InstanceCount?: Value<number>;
  WarmEnabled?: Value<boolean>;
  WarmCount?: Value<number>;
  DedicatedMasterCount?: Value<number>;
  InstanceType?: Value<string>;
  ZoneAwarenessEnabled?: Value<boolean>;
  DedicatedMasterType?: Value<string>;
  constructor(properties: ClusterConfig) {
    Object.assign(this, properties);
  }
}

export class CognitoOptions {
  UserPoolId?: Value<string>;
  Enabled?: Value<boolean>;
  IdentityPoolId?: Value<string>;
  RoleArn?: Value<string>;
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
  CustomEndpointEnabled?: Value<boolean>;
  EnforceHTTPS?: Value<boolean>;
  CustomEndpointCertificateArn?: Value<string>;
  CustomEndpoint?: Value<string>;
  TLSSecurityPolicy?: Value<string>;
  constructor(properties: DomainEndpointOptions) {
    Object.assign(this, properties);
  }
}

export class EBSOptions {
  EBSEnabled?: Value<boolean>;
  VolumeType?: Value<string>;
  Throughput?: Value<number>;
  Iops?: Value<number>;
  VolumeSize?: Value<number>;
  constructor(properties: EBSOptions) {
    Object.assign(this, properties);
  }
}

export class EncryptionAtRestOptions {
  KmsKeyId?: Value<string>;
  Enabled?: Value<boolean>;
  constructor(properties: EncryptionAtRestOptions) {
    Object.assign(this, properties);
  }
}

export class IAMFederationOptions {
  SubjectKey?: Value<string>;
  RolesKey?: Value<string>;
  Enabled?: Value<boolean>;
  constructor(properties: IAMFederationOptions) {
    Object.assign(this, properties);
  }
}

export class IdentityCenterOptions {
  IdentityCenterApplicationARN?: Value<string>;
  IdentityCenterInstanceARN?: Value<string>;
  SubjectKey?: Value<string>;
  EnabledAPIAccess?: Value<boolean>;
  RolesKey?: Value<string>;
  IdentityStoreId?: Value<string>;
  constructor(properties: IdentityCenterOptions) {
    Object.assign(this, properties);
  }
}

export class Idp {
  EntityId!: Value<string>;
  MetadataContent!: Value<string>;
  constructor(properties: Idp) {
    Object.assign(this, properties);
  }
}

export class JWTOptions {
  SubjectKey?: Value<string>;
  PublicKey?: Value<string>;
  RolesKey?: Value<string>;
  Enabled?: Value<boolean>;
  constructor(properties: JWTOptions) {
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
  MasterUserPassword?: Value<string>;
  MasterUserARN?: Value<string>;
  MasterUserName?: Value<string>;
  constructor(properties: MasterUserOptions) {
    Object.assign(this, properties);
  }
}

export class NodeConfig {
  Type?: Value<string>;
  Enabled?: Value<boolean>;
  Count?: Value<number>;
  constructor(properties: NodeConfig) {
    Object.assign(this, properties);
  }
}

export class NodeOption {
  NodeType?: Value<string>;
  NodeConfig?: NodeConfig;
  constructor(properties: NodeOption) {
    Object.assign(this, properties);
  }
}

export class NodeToNodeEncryptionOptions {
  Enabled?: Value<boolean>;
  constructor(properties: NodeToNodeEncryptionOptions) {
    Object.assign(this, properties);
  }
}

export class OffPeakWindow {
  WindowStartTime?: WindowStartTime;
  constructor(properties: OffPeakWindow) {
    Object.assign(this, properties);
  }
}

export class OffPeakWindowOptions {
  OffPeakWindow?: OffPeakWindow;
  Enabled?: Value<boolean>;
  constructor(properties: OffPeakWindowOptions) {
    Object.assign(this, properties);
  }
}

export class SAMLOptions {
  MasterBackendRole?: Value<string>;
  SubjectKey?: Value<string>;
  Idp?: Idp;
  SessionTimeoutMinutes?: Value<number>;
  RolesKey?: Value<string>;
  Enabled?: Value<boolean>;
  MasterUserName?: Value<string>;
  constructor(properties: SAMLOptions) {
    Object.assign(this, properties);
  }
}

export class ServiceSoftwareOptions {
  NewVersion?: Value<string>;
  UpdateStatus?: Value<string>;
  Description?: Value<string>;
  Cancellable?: Value<boolean>;
  CurrentVersion?: Value<string>;
  AutomatedUpdateDate?: Value<string>;
  UpdateAvailable?: Value<boolean>;
  OptionalDeployment?: Value<boolean>;
  constructor(properties: ServiceSoftwareOptions) {
    Object.assign(this, properties);
  }
}

export class SnapshotOptions {
  AutomatedSnapshotStartHour?: Value<number>;
  constructor(properties: SnapshotOptions) {
    Object.assign(this, properties);
  }
}

export class SoftwareUpdateOptions {
  AutoSoftwareUpdateEnabled?: Value<boolean>;
  constructor(properties: SoftwareUpdateOptions) {
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

export class WindowStartTime {
  Hours!: Value<number>;
  Minutes!: Value<number>;
  constructor(properties: WindowStartTime) {
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
  SkipShardMigrationWait?: Value<boolean>;
  EngineVersion?: Value<string>;
  SoftwareUpdateOptions?: SoftwareUpdateOptions;
  DomainName?: Value<string>;
  LogPublishingOptions?: { [key: string]: LogPublishingOption };
  SnapshotOptions?: SnapshotOptions;
  VPCOptions?: VPCOptions;
  NodeToNodeEncryptionOptions?: NodeToNodeEncryptionOptions;
  AccessPolicies?: { [key: string]: any };
  DomainEndpointOptions?: DomainEndpointOptions;
  CognitoOptions?: CognitoOptions;
  AdvancedOptions?: { [key: string]: Value<string> };
  AdvancedSecurityOptions?: AdvancedSecurityOptionsInput;
  IPAddressType?: Value<string>;
  IdentityCenterOptions?: IdentityCenterOptions;
  EBSOptions?: EBSOptions;
  EncryptionAtRestOptions?: EncryptionAtRestOptions;
  OffPeakWindowOptions?: OffPeakWindowOptions;
  Tags?: List<ResourceTag>;
  ClusterConfig?: ClusterConfig;
}
export default class Domain extends ResourceBase<DomainProperties> {
  static AdvancedSecurityOptionsInput = AdvancedSecurityOptionsInput;
  static ClusterConfig = ClusterConfig;
  static CognitoOptions = CognitoOptions;
  static ColdStorageOptions = ColdStorageOptions;
  static DomainEndpointOptions = DomainEndpointOptions;
  static EBSOptions = EBSOptions;
  static EncryptionAtRestOptions = EncryptionAtRestOptions;
  static IAMFederationOptions = IAMFederationOptions;
  static IdentityCenterOptions = IdentityCenterOptions;
  static Idp = Idp;
  static JWTOptions = JWTOptions;
  static LogPublishingOption = LogPublishingOption;
  static MasterUserOptions = MasterUserOptions;
  static NodeConfig = NodeConfig;
  static NodeOption = NodeOption;
  static NodeToNodeEncryptionOptions = NodeToNodeEncryptionOptions;
  static OffPeakWindow = OffPeakWindow;
  static OffPeakWindowOptions = OffPeakWindowOptions;
  static SAMLOptions = SAMLOptions;
  static ServiceSoftwareOptions = ServiceSoftwareOptions;
  static SnapshotOptions = SnapshotOptions;
  static SoftwareUpdateOptions = SoftwareUpdateOptions;
  static VPCOptions = VPCOptions;
  static WindowStartTime = WindowStartTime;
  static ZoneAwarenessConfig = ZoneAwarenessConfig;
  constructor(properties?: DomainProperties) {
    super('AWS::OpenSearchService::Domain', properties || {});
  }
}
