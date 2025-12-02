import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class CloudWatchLogsLogGroup {
  LogGroupArn?: Value<string>;
  constructor(properties: CloudWatchLogsLogGroup) {
    Object.assign(this, properties);
  }
}

export class EncryptionConfiguration {
  Type!: Value<string>;
  KmsKeyId?: Value<string>;
  KmsDataKeyReusePeriodSeconds?: Value<number>;
  constructor(properties: EncryptionConfiguration) {
    Object.assign(this, properties);
  }
}

export class LogDestination {
  CloudWatchLogsLogGroup?: CloudWatchLogsLogGroup;
  constructor(properties: LogDestination) {
    Object.assign(this, properties);
  }
}

export class LoggingConfiguration {
  IncludeExecutionData?: Value<boolean>;
  Destinations?: List<LogDestination>;
  Level?: Value<string>;
  constructor(properties: LoggingConfiguration) {
    Object.assign(this, properties);
  }
}

export class S3Location {
  Bucket!: Value<string>;
  Version?: Value<string>;
  Key!: Value<string>;
  constructor(properties: S3Location) {
    Object.assign(this, properties);
  }
}

export class TagsEntry {
  Value!: Value<string>;
  Key!: Value<string>;
  constructor(properties: TagsEntry) {
    Object.assign(this, properties);
  }
}

export class TracingConfiguration {
  Enabled?: Value<boolean>;
  constructor(properties: TracingConfiguration) {
    Object.assign(this, properties);
  }
}
export interface StateMachineProperties {
  EncryptionConfiguration?: EncryptionConfiguration;
  DefinitionString?: Value<string>;
  LoggingConfiguration?: LoggingConfiguration;
  DefinitionSubstitutions?: { [key: string]: { [key: string]: any } };
  Definition?: { [key: string]: any };
  DefinitionS3Location?: S3Location;
  StateMachineName?: Value<string>;
  RoleArn: Value<string>;
  Tags?: List<TagsEntry>;
  StateMachineType?: Value<string>;
  TracingConfiguration?: TracingConfiguration;
}
export default class StateMachine extends ResourceBase<StateMachineProperties> {
  static CloudWatchLogsLogGroup = CloudWatchLogsLogGroup;
  static EncryptionConfiguration = EncryptionConfiguration;
  static LogDestination = LogDestination;
  static LoggingConfiguration = LoggingConfiguration;
  static S3Location = S3Location;
  static TagsEntry = TagsEntry;
  static TracingConfiguration = TracingConfiguration;
  constructor(properties: StateMachineProperties) {
    super('AWS::StepFunctions::StateMachine', properties);
  }
}
