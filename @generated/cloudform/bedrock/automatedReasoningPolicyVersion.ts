import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface AutomatedReasoningPolicyVersionProperties {
  LastUpdatedDefinitionHash?: Value<string>;
  PolicyArn: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class AutomatedReasoningPolicyVersion extends ResourceBase<AutomatedReasoningPolicyVersionProperties> {
  constructor(properties: AutomatedReasoningPolicyVersionProperties) {
    super('AWS::Bedrock::AutomatedReasoningPolicyVersion', properties);
  }
}
