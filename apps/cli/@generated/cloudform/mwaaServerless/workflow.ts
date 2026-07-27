import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class EncryptionConfiguration {
  Type!: Value<string>;
  KmsKeyId?: Value<string>;
  constructor(properties: EncryptionConfiguration) {
    Object.assign(this, properties);
  }
}

export class LoggingConfiguration {
  LogGroupName!: Value<string>;
  constructor(properties: LoggingConfiguration) {
    Object.assign(this, properties);
  }
}

export class NetworkConfiguration {
  SecurityGroupIds?: List<Value<string>>;
  SubnetIds?: List<Value<string>>;
  constructor(properties: NetworkConfiguration) {
    Object.assign(this, properties);
  }
}

export class S3Location {
  VersionId?: Value<string>;
  Bucket!: Value<string>;
  ObjectKey!: Value<string>;
  constructor(properties: S3Location) {
    Object.assign(this, properties);
  }
}

export class ScheduleConfiguration {
  CronExpression?: Value<string>;
  constructor(properties: ScheduleConfiguration) {
    Object.assign(this, properties);
  }
}
export interface WorkflowProperties {
  Description?: Value<string>;
  EncryptionConfiguration?: EncryptionConfiguration;
  LoggingConfiguration?: LoggingConfiguration;
  DefinitionS3Location: S3Location;
  NetworkConfiguration?: NetworkConfiguration;
  TriggerMode?: Value<string>;
  RoleArn: Value<string>;
  Tags?: { [key: string]: Value<string> };
  Name?: Value<string>;
}
export default class Workflow extends ResourceBase<WorkflowProperties> {
  static EncryptionConfiguration = EncryptionConfiguration;
  static LoggingConfiguration = LoggingConfiguration;
  static NetworkConfiguration = NetworkConfiguration;
  static S3Location = S3Location;
  static ScheduleConfiguration = ScheduleConfiguration;
  constructor(properties: WorkflowProperties) {
    super('AWS::MWAAServerless::Workflow', properties);
  }
}
