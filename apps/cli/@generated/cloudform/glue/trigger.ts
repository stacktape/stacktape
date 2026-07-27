import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class Action {
  NotificationProperty?: NotificationProperty;
  CrawlerName?: Value<string>;
  Timeout?: Value<number>;
  JobName?: Value<string>;
  Arguments?: { [key: string]: any };
  SecurityConfiguration?: Value<string>;
  constructor(properties: Action) {
    Object.assign(this, properties);
  }
}

export class Condition {
  CrawlerName?: Value<string>;
  State?: Value<string>;
  CrawlState?: Value<string>;
  LogicalOperator?: Value<string>;
  JobName?: Value<string>;
  constructor(properties: Condition) {
    Object.assign(this, properties);
  }
}

export class EventBatchingCondition {
  BatchSize!: Value<number>;
  BatchWindow?: Value<number>;
  constructor(properties: EventBatchingCondition) {
    Object.assign(this, properties);
  }
}

export class NotificationProperty {
  NotifyDelayAfter?: Value<number>;
  constructor(properties: NotificationProperty) {
    Object.assign(this, properties);
  }
}

export class Predicate {
  Logical?: Value<string>;
  Conditions?: List<Condition>;
  constructor(properties: Predicate) {
    Object.assign(this, properties);
  }
}
export interface TriggerProperties {
  Type: Value<string>;
  StartOnCreation?: Value<boolean>;
  Description?: Value<string>;
  Actions: List<Action>;
  EventBatchingCondition?: EventBatchingCondition;
  WorkflowName?: Value<string>;
  Schedule?: Value<string>;
  Tags?: { [key: string]: any };
  Name?: Value<string>;
  Predicate?: Predicate;
}
export default class Trigger extends ResourceBase<TriggerProperties> {
  static Action = Action;
  static Condition = Condition;
  static EventBatchingCondition = EventBatchingCondition;
  static NotificationProperty = NotificationProperty;
  static Predicate = Predicate;
  constructor(properties: TriggerProperties) {
    super('AWS::Glue::Trigger', properties);
  }
}
