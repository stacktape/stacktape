import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface RuntimeEndpointProperties {
  Description?: Value<string>;
  AgentRuntimeId: Value<string>;
  AgentRuntimeVersion?: Value<string>;
  Tags?: { [key: string]: Value<string> };
  Name: Value<string>;
}
export default class RuntimeEndpoint extends ResourceBase<RuntimeEndpointProperties> {
  constructor(properties: RuntimeEndpointProperties) {
    super('AWS::BedrockAgentCore::RuntimeEndpoint', properties);
  }
}
