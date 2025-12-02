import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class GroupingAttributeDefinition {
  GroupingName!: Value<string>;
  GroupingSourceKeys!: List<Value<string>>;
  DefaultGroupingValue?: Value<string>;
  constructor(properties: GroupingAttributeDefinition) {
    Object.assign(this, properties);
  }
}
export interface GroupingConfigurationProperties {
  GroupingAttributeDefinitions: List<GroupingAttributeDefinition>;
}
export default class GroupingConfiguration extends ResourceBase<GroupingConfigurationProperties> {
  static GroupingAttributeDefinition = GroupingAttributeDefinition;
  constructor(properties: GroupingConfigurationProperties) {
    super('AWS::ApplicationSignals::GroupingConfiguration', properties);
  }
}
