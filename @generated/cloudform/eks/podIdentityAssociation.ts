import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface PodIdentityAssociationProperties {
  ServiceAccount: Value<string>;
  TargetRoleArn?: Value<string>;
  ClusterName: Value<string>;
  DisableSessionTags?: Value<boolean>;
  RoleArn: Value<string>;
  Namespace: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class PodIdentityAssociation extends ResourceBase<PodIdentityAssociationProperties> {
  constructor(properties: PodIdentityAssociationProperties) {
    super('AWS::EKS::PodIdentityAssociation', properties);
  }
}
