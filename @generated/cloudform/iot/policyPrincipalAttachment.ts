import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface PolicyPrincipalAttachmentProperties {
  PolicyName: Value<string>;
  Principal: Value<string>;
}
export default class PolicyPrincipalAttachment extends ResourceBase<PolicyPrincipalAttachmentProperties> {
  constructor(properties: PolicyPrincipalAttachmentProperties) {
    super('AWS::IoT::PolicyPrincipalAttachment', properties);
  }
}
