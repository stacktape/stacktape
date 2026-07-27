import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class EventRuleStatusSummary {
  Status!: Value<string>;
  Reason!: Value<string>;
  constructor(properties: EventRuleStatusSummary) {
    Object.assign(this, properties);
  }
}
export interface EventRuleProperties {
  EventPattern?: Value<string>;
  EventType: Value<string>;
  NotificationConfigurationArn: Value<string>;
  Regions: List<Value<string>>;
  Source: Value<string>;
}
export default class EventRule extends ResourceBase<EventRuleProperties> {
  static EventRuleStatusSummary = EventRuleStatusSummary;
  constructor(properties: EventRuleProperties) {
    super('AWS::Notifications::EventRule', properties);
  }
}
