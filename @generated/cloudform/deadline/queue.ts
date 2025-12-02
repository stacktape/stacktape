import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class JobAttachmentSettings {
  RootPrefix!: Value<string>;
  S3BucketName!: Value<string>;
  constructor(properties: JobAttachmentSettings) {
    Object.assign(this, properties);
  }
}

export class JobRunAsUser {
  RunAs!: Value<string>;
  Posix?: PosixUser;
  Windows?: WindowsUser;
  constructor(properties: JobRunAsUser) {
    Object.assign(this, properties);
  }
}

export class PosixUser {
  Group!: Value<string>;
  User!: Value<string>;
  constructor(properties: PosixUser) {
    Object.assign(this, properties);
  }
}

export class WindowsUser {
  User!: Value<string>;
  PasswordArn!: Value<string>;
  constructor(properties: WindowsUser) {
    Object.assign(this, properties);
  }
}
export interface QueueProperties {
  JobRunAsUser?: JobRunAsUser;
  AllowedStorageProfileIds?: List<Value<string>>;
  Description?: Value<string>;
  JobAttachmentSettings?: JobAttachmentSettings;
  DefaultBudgetAction?: Value<string>;
  DisplayName: Value<string>;
  RequiredFileSystemLocationNames?: List<Value<string>>;
  FarmId: Value<string>;
  RoleArn?: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class Queue extends ResourceBase<QueueProperties> {
  static JobAttachmentSettings = JobAttachmentSettings;
  static JobRunAsUser = JobRunAsUser;
  static PosixUser = PosixUser;
  static WindowsUser = WindowsUser;
  constructor(properties: QueueProperties) {
    super('AWS::Deadline::Queue', properties);
  }
}
