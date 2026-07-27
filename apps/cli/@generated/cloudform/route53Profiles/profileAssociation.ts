import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface ProfileAssociationProperties {
  ProfileId: Value<string>;
  ResourceId: Value<string>;
  Arn?: Value<string>;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
}
export default class ProfileAssociation extends ResourceBase<ProfileAssociationProperties> {
  constructor(properties: ProfileAssociationProperties) {
    super('AWS::Route53Profiles::ProfileAssociation', properties);
  }
}
