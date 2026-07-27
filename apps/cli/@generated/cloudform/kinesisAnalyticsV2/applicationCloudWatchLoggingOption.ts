import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class CloudWatchLoggingOption {
  LogStreamARN!: Value<string>;
  constructor(properties: CloudWatchLoggingOption) {
    Object.assign(this, properties);
  }
}
export interface ApplicationCloudWatchLoggingOptionProperties {
  ApplicationName: Value<string>;
  CloudWatchLoggingOption: CloudWatchLoggingOption;
}
export default class ApplicationCloudWatchLoggingOption extends ResourceBase<ApplicationCloudWatchLoggingOptionProperties> {
  static CloudWatchLoggingOption = CloudWatchLoggingOption;
  constructor(properties: ApplicationCloudWatchLoggingOptionProperties) {
    super('AWS::KinesisAnalyticsV2::ApplicationCloudWatchLoggingOption', properties);
  }
}
