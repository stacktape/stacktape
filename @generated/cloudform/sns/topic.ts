import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class LoggingConfig {
  FailureFeedbackRoleArn?: Value<string>;
  SuccessFeedbackSampleRate?: Value<string>;
  SuccessFeedbackRoleArn?: Value<string>;
  Protocol!: Value<string>;
  constructor(properties: LoggingConfig) {
    Object.assign(this, properties);
  }
}

export class Subscription {
  Endpoint!: Value<string>;
  Protocol!: Value<string>;
  constructor(properties: Subscription) {
    Object.assign(this, properties);
  }
}
export interface TopicProperties {
  KmsMasterKeyId?: Value<string>;
  TracingConfig?: Value<string>;
  FifoTopic?: Value<boolean>;
  DataProtectionPolicy?: { [key: string]: any };
  TopicName?: Value<string>;
  SignatureVersion?: Value<string>;
  DeliveryStatusLogging?: List<LoggingConfig>;
  DisplayName?: Value<string>;
  ContentBasedDeduplication?: Value<boolean>;
  Subscription?: List<Subscription>;
  FifoThroughputScope?: Value<string>;
  Tags?: List<ResourceTag>;
  ArchivePolicy?: { [key: string]: any };
}
export default class Topic extends ResourceBase<TopicProperties> {
  static LoggingConfig = LoggingConfig;
  static Subscription = Subscription;
  constructor(properties?: TopicProperties) {
    super('AWS::SNS::Topic', properties || {});
  }
}
