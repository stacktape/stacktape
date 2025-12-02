import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface EventBridgeRuleTemplateGroupProperties {
  Description?: Value<string>;
  Tags?: { [key: string]: Value<string> };
  Name: Value<string>;
}
export default class EventBridgeRuleTemplateGroup extends ResourceBase<EventBridgeRuleTemplateGroupProperties> {
  constructor(properties: EventBridgeRuleTemplateGroupProperties) {
    super('AWS::MediaLive::EventBridgeRuleTemplateGroup', properties);
  }
}
