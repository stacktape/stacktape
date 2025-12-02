import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class CloudWatchLogDestination {
  LogGroupArn!: Value<string>;
  constructor(properties: CloudWatchLogDestination) {
    Object.assign(this, properties);
  }
}

export class Label {
  Value!: Value<string>;
  Name!: Value<string>;
  constructor(properties: Label) {
    Object.assign(this, properties);
  }
}

export class LimitsPerLabelSet {
  Limits!: LimitsPerLabelSetEntry;
  LabelSet!: List<Label>;
  constructor(properties: LimitsPerLabelSet) {
    Object.assign(this, properties);
  }
}

export class LimitsPerLabelSetEntry {
  MaxSeries?: Value<number>;
  constructor(properties: LimitsPerLabelSetEntry) {
    Object.assign(this, properties);
  }
}

export class LoggingConfiguration {
  LogGroupArn?: Value<string>;
  constructor(properties: LoggingConfiguration) {
    Object.assign(this, properties);
  }
}

export class LoggingDestination {
  Filters!: LoggingFilter;
  CloudWatchLogs!: CloudWatchLogDestination;
  constructor(properties: LoggingDestination) {
    Object.assign(this, properties);
  }
}

export class LoggingFilter {
  QspThreshold!: Value<number>;
  constructor(properties: LoggingFilter) {
    Object.assign(this, properties);
  }
}

export class QueryLoggingConfiguration {
  Destinations!: List<LoggingDestination>;
  constructor(properties: QueryLoggingConfiguration) {
    Object.assign(this, properties);
  }
}

export class WorkspaceConfiguration {
  RetentionPeriodInDays?: Value<number>;
  LimitsPerLabelSets?: List<LimitsPerLabelSet>;
  constructor(properties: WorkspaceConfiguration) {
    Object.assign(this, properties);
  }
}
export interface WorkspaceProperties {
  KmsKeyArn?: Value<string>;
  QueryLoggingConfiguration?: QueryLoggingConfiguration;
  Alias?: Value<string>;
  LoggingConfiguration?: LoggingConfiguration;
  WorkspaceConfiguration?: WorkspaceConfiguration;
  AlertManagerDefinition?: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class Workspace extends ResourceBase<WorkspaceProperties> {
  static CloudWatchLogDestination = CloudWatchLogDestination;
  static Label = Label;
  static LimitsPerLabelSet = LimitsPerLabelSet;
  static LimitsPerLabelSetEntry = LimitsPerLabelSetEntry;
  static LoggingConfiguration = LoggingConfiguration;
  static LoggingDestination = LoggingDestination;
  static LoggingFilter = LoggingFilter;
  static QueryLoggingConfiguration = QueryLoggingConfiguration;
  static WorkspaceConfiguration = WorkspaceConfiguration;
  constructor(properties?: WorkspaceProperties) {
    super('AWS::APS::Workspace', properties || {});
  }
}
