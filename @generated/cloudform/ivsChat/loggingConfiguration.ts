import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class CloudWatchLogsDestinationConfiguration {
  LogGroupName!: Value<string>;
  constructor(properties: CloudWatchLogsDestinationConfiguration) {
    Object.assign(this, properties);
  }
}

export class DestinationConfiguration {
  S3?: S3DestinationConfiguration;
  Firehose?: FirehoseDestinationConfiguration;
  CloudWatchLogs?: CloudWatchLogsDestinationConfiguration;
  constructor(properties: DestinationConfiguration) {
    Object.assign(this, properties);
  }
}

export class FirehoseDestinationConfiguration {
  DeliveryStreamName!: Value<string>;
  constructor(properties: FirehoseDestinationConfiguration) {
    Object.assign(this, properties);
  }
}

export class S3DestinationConfiguration {
  BucketName!: Value<string>;
  constructor(properties: S3DestinationConfiguration) {
    Object.assign(this, properties);
  }
}
export interface LoggingConfigurationProperties {
  DestinationConfiguration: DestinationConfiguration;
  Tags?: List<ResourceTag>;
  Name?: Value<string>;
}
export default class LoggingConfiguration extends ResourceBase<LoggingConfigurationProperties> {
  static CloudWatchLogsDestinationConfiguration = CloudWatchLogsDestinationConfiguration;
  static DestinationConfiguration = DestinationConfiguration;
  static FirehoseDestinationConfiguration = FirehoseDestinationConfiguration;
  static S3DestinationConfiguration = S3DestinationConfiguration;
  constructor(properties: LoggingConfigurationProperties) {
    super('AWS::IVSChat::LoggingConfiguration', properties);
  }
}
