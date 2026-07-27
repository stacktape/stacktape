import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class NotificationChannelConfig {
  Filters?: NotificationFilterConfig;
  Sns?: SnsChannelConfig;
  constructor(properties: NotificationChannelConfig) {
    Object.assign(this, properties);
  }
}

export class NotificationFilterConfig {
  MessageTypes?: List<Value<string>>;
  Severities?: List<Value<string>>;
  constructor(properties: NotificationFilterConfig) {
    Object.assign(this, properties);
  }
}

export class SnsChannelConfig {
  TopicArn?: Value<string>;
  constructor(properties: SnsChannelConfig) {
    Object.assign(this, properties);
  }
}
export interface NotificationChannelProperties {
  Config: NotificationChannelConfig;
}
export default class NotificationChannel extends ResourceBase<NotificationChannelProperties> {
  static NotificationChannelConfig = NotificationChannelConfig;
  static NotificationFilterConfig = NotificationFilterConfig;
  static SnsChannelConfig = SnsChannelConfig;
  constructor(properties: NotificationChannelProperties) {
    super('AWS::DevOpsGuru::NotificationChannel', properties);
  }
}
