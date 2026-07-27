import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface LifecycleAutomationProperties {
  AutomationParameters: { [key: string]: any };
  AutomationDocument: Value<string>;
  Tags?: { [key: string]: Value<string> };
  ResourceKey: Value<string>;
}
export default class LifecycleAutomation extends ResourceBase<LifecycleAutomationProperties> {
  constructor(properties: LifecycleAutomationProperties) {
    super('AWS::SSMQuickSetup::LifecycleAutomation', properties);
  }
}
