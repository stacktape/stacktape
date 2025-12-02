import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class NotificationHubStatusSummary {
  NotificationHubStatus!: Value<string>;
  NotificationHubStatusReason!: Value<string>;
  constructor(properties: NotificationHubStatusSummary) {
    Object.assign(this, properties);
  }
}
export interface NotificationHubProperties {
  Region: Value<string>;
}
export default class NotificationHub extends ResourceBase<NotificationHubProperties> {
  static NotificationHubStatusSummary = NotificationHubStatusSummary;
  constructor(properties: NotificationHubProperties) {
    super('AWS::Notifications::NotificationHub', properties);
  }
}
