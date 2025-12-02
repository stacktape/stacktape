import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class ConfigurationId {
  Revision!: Value<number>;
  Id!: Value<string>;
  constructor(properties: ConfigurationId) {
    Object.assign(this, properties);
  }
}

export class EncryptionOptions {
  KmsKeyId?: Value<string>;
  UseAwsOwnedKey!: Value<boolean>;
  constructor(properties: EncryptionOptions) {
    Object.assign(this, properties);
  }
}

export class LdapServerMetadata {
  Hosts!: List<Value<string>>;
  UserRoleName?: Value<string>;
  UserSearchMatching!: Value<string>;
  RoleName?: Value<string>;
  UserBase!: Value<string>;
  UserSearchSubtree?: Value<boolean>;
  RoleSearchMatching!: Value<string>;
  ServiceAccountUsername!: Value<string>;
  RoleBase!: Value<string>;
  ServiceAccountPassword?: Value<string>;
  RoleSearchSubtree?: Value<boolean>;
  constructor(properties: LdapServerMetadata) {
    Object.assign(this, properties);
  }
}

export class LogList {
  Audit?: Value<boolean>;
  General?: Value<boolean>;
  constructor(properties: LogList) {
    Object.assign(this, properties);
  }
}

export class MaintenanceWindow {
  DayOfWeek!: Value<string>;
  TimeOfDay!: Value<string>;
  TimeZone!: Value<string>;
  constructor(properties: MaintenanceWindow) {
    Object.assign(this, properties);
  }
}

export class TagsEntry {
  Value!: Value<string>;
  Key!: Value<string>;
  constructor(properties: TagsEntry) {
    Object.assign(this, properties);
  }
}

export class User {
  ReplicationUser?: Value<boolean>;
  Username!: Value<string>;
  Groups?: List<Value<string>>;
  ConsoleAccess?: Value<boolean>;
  Password!: Value<string>;
  constructor(properties: User) {
    Object.assign(this, properties);
  }
}
export interface BrokerProperties {
  DataReplicationPrimaryBrokerArn?: Value<string>;
  SecurityGroups?: List<Value<string>>;
  EngineVersion?: Value<string>;
  StorageType?: Value<string>;
  Configuration?: ConfigurationId;
  AuthenticationStrategy?: Value<string>;
  MaintenanceWindowStartTime?: MaintenanceWindow;
  HostInstanceType: Value<string>;
  Users?: List<User>;
  AutoMinorVersionUpgrade?: Value<boolean>;
  Logs?: LogList;
  SubnetIds?: List<Value<string>>;
  DataReplicationMode?: Value<string>;
  BrokerName: Value<string>;
  LdapServerMetadata?: LdapServerMetadata;
  DeploymentMode: Value<string>;
  EngineType: Value<string>;
  PubliclyAccessible: Value<boolean>;
  EncryptionOptions?: EncryptionOptions;
  Tags?: List<TagsEntry>;
}
export default class Broker extends ResourceBase<BrokerProperties> {
  static ConfigurationId = ConfigurationId;
  static EncryptionOptions = EncryptionOptions;
  static LdapServerMetadata = LdapServerMetadata;
  static LogList = LogList;
  static MaintenanceWindow = MaintenanceWindow;
  static TagsEntry = TagsEntry;
  static User = User;
  constructor(properties: BrokerProperties) {
    super('AWS::AmazonMQ::Broker', properties);
  }
}
