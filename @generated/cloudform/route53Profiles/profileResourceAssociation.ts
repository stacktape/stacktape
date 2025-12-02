import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface ProfileResourceAssociationProperties {
  ProfileId: Value<string>;
  ResourceArn: Value<string>;
  ResourceProperties?: Value<string>;
  Name: Value<string>;
}
export default class ProfileResourceAssociation extends ResourceBase<ProfileResourceAssociationProperties> {
  constructor(properties: ProfileResourceAssociationProperties) {
    super('AWS::Route53Profiles::ProfileResourceAssociation', properties);
  }
}
