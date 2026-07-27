import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface AgentStatusProperties {
  ResetOrderNumber?: Value<boolean>;
  Type?: Value<string>;
  Description?: Value<string>;
  DisplayOrder?: Value<number>;
  State: Value<string>;
  InstanceArn: Value<string>;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
}
export default class AgentStatus extends ResourceBase<AgentStatusProperties> {
  constructor(properties: AgentStatusProperties) {
    super('AWS::Connect::AgentStatus', properties);
  }
}
