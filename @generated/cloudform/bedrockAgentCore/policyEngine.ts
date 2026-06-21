import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface PolicyEngineProperties {
  Description?: Value<string>;
  EncryptionKeyArn?: Value<string>;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
}
export default class PolicyEngine extends ResourceBase<PolicyEngineProperties> {
  constructor(properties: PolicyEngineProperties) {
    super('AWS::BedrockAgentCore::PolicyEngine', properties);
  }
}
