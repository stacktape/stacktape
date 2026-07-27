import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class HttpsNotificationConfiguration {
  Endpoint!: Value<string>;
  TargetRoleArn!: Value<string>;
  AuthorizationApiKeyValue?: Value<string>;
  AuthorizationApiKeyName?: Value<string>;
  HttpMethod?: Value<string>;
  constructor(properties: HttpsNotificationConfiguration) {
    Object.assign(this, properties);
  }
}

export class NotificationConfiguration {
  HttpsNotificationConfiguration?: HttpsNotificationConfiguration;
  SqsNotificationConfiguration?: { [key: string]: any };
  constructor(properties: NotificationConfiguration) {
    Object.assign(this, properties);
  }
}
export interface SubscriberNotificationProperties {
  SubscriberArn: Value<string>;
  NotificationConfiguration: NotificationConfiguration;
}
export default class SubscriberNotification extends ResourceBase<SubscriberNotificationProperties> {
  static HttpsNotificationConfiguration = HttpsNotificationConfiguration;
  static NotificationConfiguration = NotificationConfiguration;
  constructor(properties: SubscriberNotificationProperties) {
    super('AWS::SecurityLake::SubscriberNotification', properties);
  }
}
