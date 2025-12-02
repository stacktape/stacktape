import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface PolicyAssociationProperties {
  ConfigurationPolicyId: Value<string>;
  TargetType: Value<string>;
  TargetId: Value<string>;
}
export default class PolicyAssociation extends ResourceBase<PolicyAssociationProperties> {
  constructor(properties: PolicyAssociationProperties) {
    super('AWS::SecurityHub::PolicyAssociation', properties);
  }
}
