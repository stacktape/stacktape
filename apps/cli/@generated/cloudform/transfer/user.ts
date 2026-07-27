import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class HomeDirectoryMapEntry {
  Entry!: Value<string>;
  Target!: Value<string>;
  Type?: Value<string>;
  constructor(properties: HomeDirectoryMapEntry) {
    Object.assign(this, properties);
  }
}

export class PosixProfile {
  Uid!: Value<number>;
  SecondaryGids?: List<Value<number>>;
  Gid!: Value<number>;
  constructor(properties: PosixProfile) {
    Object.assign(this, properties);
  }
}
export interface UserProperties {
  Policy?: Value<string>;
  Role: Value<string>;
  HomeDirectory?: Value<string>;
  HomeDirectoryType?: Value<string>;
  ServerId: Value<string>;
  UserName: Value<string>;
  HomeDirectoryMappings?: List<HomeDirectoryMapEntry>;
  PosixProfile?: PosixProfile;
  SshPublicKeys?: List<Value<string>>;
  Tags?: List<ResourceTag>;
}
export default class User extends ResourceBase<UserProperties> {
  static HomeDirectoryMapEntry = HomeDirectoryMapEntry;
  static PosixProfile = PosixProfile;
  constructor(properties: UserProperties) {
    super('AWS::Transfer::User', properties);
  }
}
