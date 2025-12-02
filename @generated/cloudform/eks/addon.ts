import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class NamespaceConfig {
  Namespace!: Value<string>;
  constructor(properties: NamespaceConfig) {
    Object.assign(this, properties);
  }
}

export class PodIdentityAssociation {
  ServiceAccount!: Value<string>;
  RoleArn!: Value<string>;
  constructor(properties: PodIdentityAssociation) {
    Object.assign(this, properties);
  }
}
export interface AddonProperties {
  NamespaceConfig?: NamespaceConfig;
  PreserveOnDelete?: Value<boolean>;
  AddonVersion?: Value<string>;
  ServiceAccountRoleArn?: Value<string>;
  ClusterName: Value<string>;
  AddonName: Value<string>;
  PodIdentityAssociations?: List<PodIdentityAssociation>;
  ResolveConflicts?: Value<string>;
  Tags?: List<ResourceTag>;
  ConfigurationValues?: Value<string>;
}
export default class Addon extends ResourceBase<AddonProperties> {
  static NamespaceConfig = NamespaceConfig;
  static PodIdentityAssociation = PodIdentityAssociation;
  constructor(properties: AddonProperties) {
    super('AWS::EKS::Addon', properties);
  }
}
