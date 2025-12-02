import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface ProfileProperties {
  Logging: Value<string>;
  Email?: Value<string>;
  BusinessName: Value<string>;
  Phone: Value<string>;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
}
export default class Profile extends ResourceBase<ProfileProperties> {
  constructor(properties: ProfileProperties) {
    super('AWS::B2BI::Profile', properties);
  }
}
