import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class EventTriggerCondition {
  EventTriggerDimensions!: List<EventTriggerDimension>;
  LogicalOperator!: Value<string>;
  constructor(properties: EventTriggerCondition) {
    Object.assign(this, properties);
  }
}

export class EventTriggerDimension {
  ObjectAttributes!: List<ObjectAttribute>;
  constructor(properties: EventTriggerDimension) {
    Object.assign(this, properties);
  }
}

export class EventTriggerLimits {
  Periods?: List<Period>;
  EventExpiration?: Value<number>;
  constructor(properties: EventTriggerLimits) {
    Object.assign(this, properties);
  }
}

export class ObjectAttribute {
  ComparisonOperator!: Value<string>;
  Values!: List<Value<string>>;
  FieldName?: Value<string>;
  Source?: Value<string>;
  constructor(properties: ObjectAttribute) {
    Object.assign(this, properties);
  }
}

export class Period {
  MaxInvocationsPerProfile?: Value<number>;
  Value!: Value<number>;
  Unlimited?: Value<boolean>;
  Unit!: Value<string>;
  constructor(properties: Period) {
    Object.assign(this, properties);
  }
}
export interface EventTriggerProperties {
  EventTriggerLimits?: EventTriggerLimits;
  Description?: Value<string>;
  DomainName: Value<string>;
  ObjectTypeName: Value<string>;
  SegmentFilter?: Value<string>;
  EventTriggerConditions: List<EventTriggerCondition>;
  EventTriggerName: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class EventTrigger extends ResourceBase<EventTriggerProperties> {
  static EventTriggerCondition = EventTriggerCondition;
  static EventTriggerDimension = EventTriggerDimension;
  static EventTriggerLimits = EventTriggerLimits;
  static ObjectAttribute = ObjectAttribute;
  static Period = Period;
  constructor(properties: EventTriggerProperties) {
    super('AWS::CustomerProfiles::EventTrigger', properties);
  }
}
