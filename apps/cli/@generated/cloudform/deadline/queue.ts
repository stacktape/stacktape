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

export class PriorityBalancedSchedulingConfiguration {
  RenderingTaskBuffer?: Value<number>;
  constructor(properties: PriorityBalancedSchedulingConfiguration) {
    Object.assign(this, properties);
  }
}

export class SchedulingConfiguration {
  PriorityBalanced?: PriorityBalancedSchedulingConfiguration;
  PriorityFifo?: { [key: string]: any };
  WeightedBalanced?: WeightedBalancedSchedulingConfiguration;
  constructor(properties: SchedulingConfiguration) {
    Object.assign(this, properties);
  }
}

export class SchedulingMaxPriorityOverride {
  AlwaysScheduleFirst!: { [key: string]: any };
  constructor(properties: SchedulingMaxPriorityOverride) {
    Object.assign(this, properties);
  }
}

export class SchedulingMinPriorityOverride {
  AlwaysScheduleLast!: { [key: string]: any };
  constructor(properties: SchedulingMinPriorityOverride) {
    Object.assign(this, properties);
  }
}

export class WeightedBalancedSchedulingConfiguration {
  ErrorWeight?: Value<number>;
  MaxPriorityOverride?: SchedulingMaxPriorityOverride;
  PriorityWeight?: Value<number>;
  SubmissionTimeWeight?: Value<number>;
  MinPriorityOverride?: SchedulingMinPriorityOverride;
  RenderingTaskWeight?: Value<number>;
  RenderingTaskBuffer?: Value<number>;
  constructor(properties: WeightedBalancedSchedulingConfiguration) {
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
  SchedulingConfiguration?: SchedulingConfiguration;
  RequiredFileSystemLocationNames?: List<Value<string>>;
  DefaultBudgetAction?: Value<string>;
  DisplayName: Value<string>;
  FarmId: Value<string>;
  RoleArn?: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class Queue extends ResourceBase<QueueProperties> {
  static JobAttachmentSettings = JobAttachmentSettings;
  static JobRunAsUser = JobRunAsUser;
  static PosixUser = PosixUser;
  static PriorityBalancedSchedulingConfiguration = PriorityBalancedSchedulingConfiguration;
  static SchedulingConfiguration = SchedulingConfiguration;
  static SchedulingMaxPriorityOverride = SchedulingMaxPriorityOverride;
  static SchedulingMinPriorityOverride = SchedulingMinPriorityOverride;
  static WeightedBalancedSchedulingConfiguration = WeightedBalancedSchedulingConfiguration;
  static WindowsUser = WindowsUser;
  constructor(properties: QueueProperties) {
    super('AWS::Deadline::Queue', properties);
  }
}
