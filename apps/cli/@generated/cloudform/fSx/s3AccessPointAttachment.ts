import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class FileSystemGID {
  Gid!: Value<number>;
  constructor(properties: FileSystemGID) {
    Object.assign(this, properties);
  }
}

export class OntapFileSystemIdentity {
  Type!: Value<string>;
  UnixUser?: OntapUnixFileSystemUser;
  WindowsUser?: OntapWindowsFileSystemUser;
  constructor(properties: OntapFileSystemIdentity) {
    Object.assign(this, properties);
  }
}

export class OntapUnixFileSystemUser {
  Name!: Value<string>;
  constructor(properties: OntapUnixFileSystemUser) {
    Object.assign(this, properties);
  }
}

export class OntapWindowsFileSystemUser {
  Name!: Value<string>;
  constructor(properties: OntapWindowsFileSystemUser) {
    Object.assign(this, properties);
  }
}

export class OpenZFSFileSystemIdentity {
  Type!: Value<string>;
  PosixUser!: OpenZFSPosixFileSystemUser;
  constructor(properties: OpenZFSFileSystemIdentity) {
    Object.assign(this, properties);
  }
}

export class OpenZFSPosixFileSystemUser {
  Uid!: Value<number>;
  SecondaryGids?: List<FileSystemGID>;
  Gid!: Value<number>;
  constructor(properties: OpenZFSPosixFileSystemUser) {
    Object.assign(this, properties);
  }
}

export class S3AccessPoint {
  Policy?: { [key: string]: any };
  ResourceARN?: Value<string>;
  Alias?: Value<string>;
  VpcConfiguration?: S3AccessPointVpcConfiguration;
  constructor(properties: S3AccessPoint) {
    Object.assign(this, properties);
  }
}

export class S3AccessPointOntapConfiguration {
  VolumeId!: Value<string>;
  FileSystemIdentity!: OntapFileSystemIdentity;
  constructor(properties: S3AccessPointOntapConfiguration) {
    Object.assign(this, properties);
  }
}

export class S3AccessPointOpenZFSConfiguration {
  VolumeId!: Value<string>;
  FileSystemIdentity!: OpenZFSFileSystemIdentity;
  constructor(properties: S3AccessPointOpenZFSConfiguration) {
    Object.assign(this, properties);
  }
}

export class S3AccessPointVpcConfiguration {
  VpcId!: Value<string>;
  constructor(properties: S3AccessPointVpcConfiguration) {
    Object.assign(this, properties);
  }
}
export interface S3AccessPointAttachmentProperties {
  OpenZFSConfiguration?: S3AccessPointOpenZFSConfiguration;
  Type: Value<string>;
  S3AccessPoint?: S3AccessPoint;
  OntapConfiguration?: S3AccessPointOntapConfiguration;
  Name: Value<string>;
}
export default class S3AccessPointAttachment extends ResourceBase<S3AccessPointAttachmentProperties> {
  static FileSystemGID = FileSystemGID;
  static OntapFileSystemIdentity = OntapFileSystemIdentity;
  static OntapUnixFileSystemUser = OntapUnixFileSystemUser;
  static OntapWindowsFileSystemUser = OntapWindowsFileSystemUser;
  static OpenZFSFileSystemIdentity = OpenZFSFileSystemIdentity;
  static OpenZFSPosixFileSystemUser = OpenZFSPosixFileSystemUser;
  static S3AccessPoint = S3AccessPoint;
  static S3AccessPointOntapConfiguration = S3AccessPointOntapConfiguration;
  static S3AccessPointOpenZFSConfiguration = S3AccessPointOpenZFSConfiguration;
  static S3AccessPointVpcConfiguration = S3AccessPointVpcConfiguration;
  constructor(properties: S3AccessPointAttachmentProperties) {
    super('AWS::FSx::S3AccessPointAttachment', properties);
  }
}
