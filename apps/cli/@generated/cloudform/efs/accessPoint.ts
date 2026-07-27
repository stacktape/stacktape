import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class AccessPointTag {
  Value?: Value<string>;
  Key?: Value<string>;
  constructor(properties: AccessPointTag) {
    Object.assign(this, properties);
  }
}

export class CreationInfo {
  OwnerGid!: Value<string>;
  OwnerUid!: Value<string>;
  Permissions!: Value<string>;
  constructor(properties: CreationInfo) {
    Object.assign(this, properties);
  }
}

export class PosixUser {
  Uid!: Value<string>;
  SecondaryGids?: List<Value<string>>;
  Gid!: Value<string>;
  constructor(properties: PosixUser) {
    Object.assign(this, properties);
  }
}

export class RootDirectory {
  Path?: Value<string>;
  CreationInfo?: CreationInfo;
  constructor(properties: RootDirectory) {
    Object.assign(this, properties);
  }
}
export interface AccessPointProperties {
  FileSystemId: Value<string>;
  RootDirectory?: RootDirectory;
  ClientToken?: Value<string>;
  AccessPointTags?: List<AccessPointTag>;
  PosixUser?: PosixUser;
}
export default class AccessPoint extends ResourceBase<AccessPointProperties> {
  static AccessPointTag = AccessPointTag;
  static CreationInfo = CreationInfo;
  static PosixUser = PosixUser;
  static RootDirectory = RootDirectory;
  constructor(properties: AccessPointProperties) {
    super('AWS::EFS::AccessPoint', properties);
  }
}
