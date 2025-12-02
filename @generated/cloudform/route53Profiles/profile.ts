import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface ProfileProperties {
  Tags?: List<ResourceTag>;
  Name: Value<string>;
}
export default class Profile extends ResourceBase<ProfileProperties> {
  constructor(properties: ProfileProperties) {
    super('AWS::Route53Profiles::Profile', properties);
  }
}
