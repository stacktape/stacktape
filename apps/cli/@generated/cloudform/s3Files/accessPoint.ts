import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AccessPointTag {
  Value?: Value<string>;
  Key?: Value<string>;
  constructor(properties: AccessPointTag) {
    Object.assign(this, properties);
  }
}

export class CreationPermissions {
  OwnerGid!: Value<string>;
  OwnerUid!: Value<string>;
  Permissions!: Value<string>;
  constructor(properties: CreationPermissions) {
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
  CreationPermissions?: CreationPermissions;
  constructor(properties: RootDirectory) {
    Object.assign(this, properties);
  }
}
export interface AccessPointProperties {
  FileSystemId: Value<string>;
  RootDirectory?: RootDirectory;
  ClientToken?: Value<string>;
  PosixUser?: PosixUser;
  Tags?: List<AccessPointTag>;
}
export default class AccessPoint extends ResourceBase<AccessPointProperties> {
  static AccessPointTag = AccessPointTag;
  static CreationPermissions = CreationPermissions;
  static PosixUser = PosixUser;
  static RootDirectory = RootDirectory;
  constructor(properties: AccessPointProperties) {
    super('AWS::S3Files::AccessPoint', properties);
  }
}
