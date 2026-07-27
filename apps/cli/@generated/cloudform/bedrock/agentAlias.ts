import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AgentAliasHistoryEvent {
  StartDate?: Value<string>;
  RoutingConfiguration?: List<AgentAliasRoutingConfigurationListItem>;
  EndDate?: Value<string>;
  constructor(properties: AgentAliasHistoryEvent) {
    Object.assign(this, properties);
  }
}

export class AgentAliasRoutingConfigurationListItem {
  AgentVersion!: Value<string>;
  constructor(properties: AgentAliasRoutingConfigurationListItem) {
    Object.assign(this, properties);
  }
}
export interface AgentAliasProperties {
  AgentAliasName: Value<string>;
  Description?: Value<string>;
  RoutingConfiguration?: List<AgentAliasRoutingConfigurationListItem>;
  AgentId: Value<string>;
  Tags?: { [key: string]: Value<string> };
}
export default class AgentAlias extends ResourceBase<AgentAliasProperties> {
  static AgentAliasHistoryEvent = AgentAliasHistoryEvent;
  static AgentAliasRoutingConfigurationListItem = AgentAliasRoutingConfigurationListItem;
  constructor(properties: AgentAliasProperties) {
    super('AWS::Bedrock::AgentAlias', properties);
  }
}
