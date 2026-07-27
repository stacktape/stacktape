import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface PolicyTemplateProperties {
  Description?: Value<string>;
  Statement: Value<string>;
  PolicyStoreId: Value<string>;
}
export default class PolicyTemplate extends ResourceBase<PolicyTemplateProperties> {
  constructor(properties: PolicyTemplateProperties) {
    super('AWS::VerifiedPermissions::PolicyTemplate', properties);
  }
}
