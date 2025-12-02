import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
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
  PhoneType!: Value<string>;
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
export interface UserProperties {
  RoutingProfileArn: Value<string>;
  Username: Value<string>;
  PhoneConfig: UserPhoneConfig;
  InstanceArn: Value<string>;
  DirectoryUserId?: Value<string>;
  IdentityInfo?: UserIdentityInfo;
  HierarchyGroupArn?: Value<string>;
  SecurityProfileArns: List<Value<string>>;
  Tags?: List<ResourceTag>;
  UserProficiencies?: List<UserProficiency>;
  Password?: Value<string>;
}
export default class User extends ResourceBase<UserProperties> {
  static UserIdentityInfo = UserIdentityInfo;
  static UserPhoneConfig = UserPhoneConfig;
  static UserProficiency = UserProficiency;
  constructor(properties: UserProperties) {
    super('AWS::Connect::User', properties);
  }
}
