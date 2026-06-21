import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AfterContactWorkConfig {
  AfterContactWorkTimeLimit?: Value<number>;
  constructor(properties: AfterContactWorkConfig) {
    Object.assign(this, properties);
  }
}

export class AfterContactWorkConfigPerChannel {
  AfterContactWorkConfig!: AfterContactWorkConfig;
  Channel!: Value<string>;
  AgentFirstCallbackAfterContactWorkConfig?: AfterContactWorkConfig;
  constructor(properties: AfterContactWorkConfigPerChannel) {
    Object.assign(this, properties);
  }
}

export class AutoAcceptConfig {
  AutoAccept!: Value<boolean>;
  AgentFirstCallbackAutoAccept?: Value<boolean>;
  Channel!: Value<string>;
  constructor(properties: AutoAcceptConfig) {
    Object.assign(this, properties);
  }
}

export class PersistentConnectionConfig {
  PersistentConnection!: Value<boolean>;
  Channel!: Value<string>;
  constructor(properties: PersistentConnectionConfig) {
    Object.assign(this, properties);
  }
}

export class PhoneNumberConfig {
  PhoneType!: Value<string>;
  Channel!: Value<string>;
  PhoneNumber?: Value<string>;
  constructor(properties: PhoneNumberConfig) {
    Object.assign(this, properties);
  }
}

export class UserIdentityInfo {
  Email?: Value<string>;
  FirstName?: Value<string>;
  SecondaryEmail?: Value<string>;
  LastName?: Value<string>;
  Mobile?: Value<string>;
  constructor(properties: UserIdentityInfo) {
    Object.assign(this, properties);
  }
}

export class UserPhoneConfig {
  AutoAccept?: Value<boolean>;
  PhoneType?: Value<string>;
  PersistentConnection?: Value<boolean>;
  DeskPhoneNumber?: Value<string>;
  AfterContactWorkTimeLimit?: Value<number>;
  constructor(properties: UserPhoneConfig) {
    Object.assign(this, properties);
  }
}

export class UserProficiency {
  AttributeValue!: Value<string>;
  AttributeName!: Value<string>;
  Level!: Value<number>;
  constructor(properties: UserProficiency) {
    Object.assign(this, properties);
  }
}

export class VoiceEnhancementConfig {
  VoiceEnhancementMode!: Value<string>;
  Channel!: Value<string>;
  constructor(properties: VoiceEnhancementConfig) {
    Object.assign(this, properties);
  }
}
export interface UserProperties {
  AfterContactWorkConfigs?: List<AfterContactWorkConfigPerChannel>;
  RoutingProfileArn: Value<string>;
  PhoneConfig?: UserPhoneConfig;
  DirectoryUserId?: Value<string>;
  HierarchyGroupArn?: Value<string>;
  PersistentConnectionConfigs?: List<PersistentConnectionConfig>;
  UserProficiencies?: List<UserProficiency>;
  VoiceEnhancementConfigs?: List<VoiceEnhancementConfig>;
  PhoneNumberConfigs?: List<PhoneNumberConfig>;
  Username: Value<string>;
  InstanceArn: Value<string>;
  IdentityInfo?: UserIdentityInfo;
  SecurityProfileArns: List<Value<string>>;
  AutoAcceptConfigs?: List<AutoAcceptConfig>;
  Tags?: List<ResourceTag>;
  Password?: Value<string>;
}
export default class User extends ResourceBase<UserProperties> {
  static AfterContactWorkConfig = AfterContactWorkConfig;
  static AfterContactWorkConfigPerChannel = AfterContactWorkConfigPerChannel;
  static AutoAcceptConfig = AutoAcceptConfig;
  static PersistentConnectionConfig = PersistentConnectionConfig;
  static PhoneNumberConfig = PhoneNumberConfig;
  static UserIdentityInfo = UserIdentityInfo;
  static UserPhoneConfig = UserPhoneConfig;
  static UserProficiency = UserProficiency;
  static VoiceEnhancementConfig = VoiceEnhancementConfig;
  constructor(properties: UserProperties) {
    super('AWS::Connect::User', properties);
  }
}
