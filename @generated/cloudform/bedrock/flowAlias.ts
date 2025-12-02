import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class FlowAliasConcurrencyConfiguration {
  Type!: Value<string>;
  MaxConcurrency?: Value<number>;
  constructor(properties: FlowAliasConcurrencyConfiguration) {
    Object.assign(this, properties);
  }
}

export class FlowAliasRoutingConfigurationListItem {
  FlowVersion?: Value<string>;
  constructor(properties: FlowAliasRoutingConfigurationListItem) {
    Object.assign(this, properties);
  }
}
export interface FlowAliasProperties {
  Description?: Value<string>;
  ConcurrencyConfiguration?: FlowAliasConcurrencyConfiguration;
  RoutingConfiguration: List<FlowAliasRoutingConfigurationListItem>;
  FlowArn: Value<string>;
  Tags?: { [key: string]: Value<string> };
  Name: Value<string>;
}
export default class FlowAlias extends ResourceBase<FlowAliasProperties> {
  static FlowAliasConcurrencyConfiguration = FlowAliasConcurrencyConfiguration;
  static FlowAliasRoutingConfigurationListItem = FlowAliasRoutingConfigurationListItem;
  constructor(properties: FlowAliasProperties) {
    super('AWS::Bedrock::FlowAlias', properties);
  }
}
