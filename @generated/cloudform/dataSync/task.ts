import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class Deleted {
  ReportLevel?: Value<string>;
  constructor(properties: Deleted) {
    Object.assign(this, properties);
  }
}

export class Destination {
  S3?: TaskReportConfigDestinationS3;
  constructor(properties: Destination) {
    Object.assign(this, properties);
  }
}

export class FilterRule {
  FilterType?: Value<string>;
  Value?: Value<string>;
  constructor(properties: FilterRule) {
    Object.assign(this, properties);
  }
}

export class ManifestConfig {
  Action?: Value<string>;
  Format?: Value<string>;
  Source!: Source;
  constructor(properties: ManifestConfig) {
    Object.assign(this, properties);
  }
}

export class ManifestConfigSourceS3 {
  S3BucketArn?: Value<string>;
  BucketAccessRoleArn?: Value<string>;
  ManifestObjectVersionId?: Value<string>;
  ManifestObjectPath?: Value<string>;
  constructor(properties: ManifestConfigSourceS3) {
    Object.assign(this, properties);
  }
}

export class Options {
  VerifyMode?: Value<string>;
  Gid?: Value<string>;
  Atime?: Value<string>;
  OverwriteMode?: Value<string>;
  PreserveDevices?: Value<string>;
  Mtime?: Value<string>;
  TaskQueueing?: Value<string>;
  TransferMode?: Value<string>;
  LogLevel?: Value<string>;
  ObjectTags?: Value<string>;
  Uid?: Value<string>;
  BytesPerSecond?: Value<number>;
  PosixPermissions?: Value<string>;
  PreserveDeletedFiles?: Value<string>;
  SecurityDescriptorCopyFlags?: Value<string>;
  constructor(properties: Options) {
    Object.assign(this, properties);
  }
}

export class Overrides {
  Verified?: Verified;
  Skipped?: Skipped;
  Transferred?: Transferred;
  Deleted?: Deleted;
  constructor(properties: Overrides) {
    Object.assign(this, properties);
  }
}

export class Skipped {
  ReportLevel?: Value<string>;
  constructor(properties: Skipped) {
    Object.assign(this, properties);
  }
}

export class Source {
  S3?: ManifestConfigSourceS3;
  constructor(properties: Source) {
    Object.assign(this, properties);
  }
}

export class TaskReportConfig {
  Destination!: Destination;
  ReportLevel?: Value<string>;
  ObjectVersionIds?: Value<string>;
  Overrides?: Overrides;
  OutputType!: Value<string>;
  constructor(properties: TaskReportConfig) {
    Object.assign(this, properties);
  }
}

export class TaskReportConfigDestinationS3 {
  Subdirectory?: Value<string>;
  S3BucketArn?: Value<string>;
  BucketAccessRoleArn?: Value<string>;
  constructor(properties: TaskReportConfigDestinationS3) {
    Object.assign(this, properties);
  }
}

export class TaskSchedule {
  Status?: Value<string>;
  ScheduleExpression?: Value<string>;
  constructor(properties: TaskSchedule) {
    Object.assign(this, properties);
  }
}

export class Transferred {
  ReportLevel?: Value<string>;
  constructor(properties: Transferred) {
    Object.assign(this, properties);
  }
}

export class Verified {
  ReportLevel?: Value<string>;
  constructor(properties: Verified) {
    Object.assign(this, properties);
  }
}
export interface TaskProperties {
  Includes?: List<FilterRule>;
  DestinationLocationArn: Value<string>;
  Options?: Options;
  Schedule?: TaskSchedule;
  CloudWatchLogGroupArn?: Value<string>;
  SourceLocationArn: Value<string>;
  TaskReportConfig?: TaskReportConfig;
  Excludes?: List<FilterRule>;
  TaskMode?: Value<string>;
  Tags?: List<ResourceTag>;
  Name?: Value<string>;
  ManifestConfig?: ManifestConfig;
}
export default class Task extends ResourceBase<TaskProperties> {
  static Deleted = Deleted;
  static Destination = Destination;
  static FilterRule = FilterRule;
  static ManifestConfig = ManifestConfig;
  static ManifestConfigSourceS3 = ManifestConfigSourceS3;
  static Options = Options;
  static Overrides = Overrides;
  static Skipped = Skipped;
  static Source = Source;
  static TaskReportConfig = TaskReportConfig;
  static TaskReportConfigDestinationS3 = TaskReportConfigDestinationS3;
  static TaskSchedule = TaskSchedule;
  static Transferred = Transferred;
  static Verified = Verified;
  constructor(properties: TaskProperties) {
    super('AWS::DataSync::Task', properties);
  }
}
