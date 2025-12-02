import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class CustomerManagedPolicyReference {
  Path?: Value<string>;
  Name!: Value<string>;
  constructor(properties: CustomerManagedPolicyReference) {
    Object.assign(this, properties);
  }
}

export class PermissionsBoundary {
  CustomerManagedPolicyReference?: CustomerManagedPolicyReference;
  ManagedPolicyArn?: Value<string>;
  constructor(properties: PermissionsBoundary) {
    Object.assign(this, properties);
  }
}
export interface PermissionSetProperties {
  RelayStateType?: Value<string>;
  CustomerManagedPolicyReferences?: List<CustomerManagedPolicyReference>;
  SessionDuration?: Value<string>;
  Description?: Value<string>;
  InstanceArn: Value<string>;
  InlinePolicy?: { [key: string]: any };
  ManagedPolicies?: List<Value<string>>;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
  PermissionsBoundary?: PermissionsBoundary;
}
export default class PermissionSet extends ResourceBase<PermissionSetProperties> {
  static CustomerManagedPolicyReference = CustomerManagedPolicyReference;
  static PermissionsBoundary = PermissionsBoundary;
  constructor(properties: PermissionSetProperties) {
    super('AWS::SSO::PermissionSet', properties);
  }
}
