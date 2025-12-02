import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class EventBridgeRuleTemplateTarget {
  Arn!: Value<string>;
  constructor(properties: EventBridgeRuleTemplateTarget) {
    Object.assign(this, properties);
  }
}
export interface EventBridgeRuleTemplateProperties {
  Description?: Value<string>;
  EventTargets?: List<EventBridgeRuleTemplateTarget>;
  EventType: Value<string>;
  Tags?: { [key: string]: Value<string> };
  GroupIdentifier?: Value<string>;
  Name: Value<string>;
}
export default class EventBridgeRuleTemplate extends ResourceBase<EventBridgeRuleTemplateProperties> {
  static EventBridgeRuleTemplateTarget = EventBridgeRuleTemplateTarget;
  constructor(properties: EventBridgeRuleTemplateProperties) {
    super('AWS::MediaLive::EventBridgeRuleTemplate', properties);
  }
}
