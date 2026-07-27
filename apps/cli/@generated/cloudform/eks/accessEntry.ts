import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AccessPolicy {
  PolicyArn!: Value<string>;
  AccessScope!: AccessScope;
  constructor(properties: AccessPolicy) {
    Object.assign(this, properties);
  }
}

export class AccessScope {
  Namespaces?: List<Value<string>>;
  Type!: Value<string>;
  constructor(properties: AccessScope) {
    Object.assign(this, properties);
  }
}
export interface AccessEntryProperties {
  Type?: Value<string>;
  PrincipalArn: Value<string>;
  KubernetesGroups?: List<Value<string>>;
  Username?: Value<string>;
  ClusterName: Value<string>;
  AccessPolicies?: List<AccessPolicy>;
  Tags?: List<ResourceTag>;
}
export default class AccessEntry extends ResourceBase<AccessEntryProperties> {
  static AccessPolicy = AccessPolicy;
  static AccessScope = AccessScope;
  constructor(properties: AccessEntryProperties) {
    super('AWS::EKS::AccessEntry', properties);
  }
}
