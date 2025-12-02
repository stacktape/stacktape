import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class CloudWatchLogsConfiguration {
  LogGroupArn?: Value<string>;
  constructor(properties: CloudWatchLogsConfiguration) {
    Object.assign(this, properties);
  }
}

export class FirehoseConfiguration {
  StreamArn?: Value<string>;
  constructor(properties: FirehoseConfiguration) {
    Object.assign(this, properties);
  }
}

export class LogConfiguration {
  FirehoseConfiguration?: FirehoseConfiguration;
  EventSource?: Value<string>;
  S3Configuration?: S3Configuration;
  CloudWatchLogsConfiguration?: CloudWatchLogsConfiguration;
  LogLevel?: Value<string>;
  constructor(properties: LogConfiguration) {
    Object.assign(this, properties);
  }
}

export class S3Configuration {
  BucketArn?: Value<string>;
  constructor(properties: S3Configuration) {
    Object.assign(this, properties);
  }
}
export interface LogDeliveryConfigurationProperties {
  UserPoolId: Value<string>;
  LogConfigurations?: List<LogConfiguration>;
}
export default class LogDeliveryConfiguration extends ResourceBase<LogDeliveryConfigurationProperties> {
  static CloudWatchLogsConfiguration = CloudWatchLogsConfiguration;
  static FirehoseConfiguration = FirehoseConfiguration;
  static LogConfiguration = LogConfiguration;
  static S3Configuration = S3Configuration;
  constructor(properties: LogDeliveryConfigurationProperties) {
    super('AWS::Cognito::LogDeliveryConfiguration', properties);
  }
}
