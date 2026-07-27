import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class EntityType {
  Description?: Value<string>;
  CreatedTime?: Value<string>;
  LastUpdatedTime?: Value<string>;
  Inline?: Value<boolean>;
  Arn?: Value<string>;
  Tags?: List<ResourceTag>;
  Name?: Value<string>;
  constructor(properties: EntityType) {
    Object.assign(this, properties);
  }
}

export class EventVariable {
  DefaultValue?: Value<string>;
  Description?: Value<string>;
  CreatedTime?: Value<string>;
  VariableType?: Value<string>;
  DataType?: Value<string>;
  LastUpdatedTime?: Value<string>;
  Inline?: Value<boolean>;
  Arn?: Value<string>;
  Tags?: List<ResourceTag>;
  Name?: Value<string>;
  DataSource?: Value<string>;
  constructor(properties: EventVariable) {
    Object.assign(this, properties);
  }
}

export class Label {
  Description?: Value<string>;
  CreatedTime?: Value<string>;
  LastUpdatedTime?: Value<string>;
  Inline?: Value<boolean>;
  Arn?: Value<string>;
  Tags?: List<ResourceTag>;
  Name?: Value<string>;
  constructor(properties: Label) {
    Object.assign(this, properties);
  }
}
export interface EventTypeProperties {
  EntityTypes: List<EntityType>;
  Description?: Value<string>;
  Labels: List<Label>;
  EventVariables: List<EventVariable>;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
}
export default class EventType extends ResourceBase<EventTypeProperties> {
  static EntityType = EntityType;
  static EventVariable = EventVariable;
  static Label = Label;
  constructor(properties: EventTypeProperties) {
    super('AWS::FraudDetector::EventType', properties);
  }
}
