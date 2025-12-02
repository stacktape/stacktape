import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class ApiKeyRestrictions {
  AllowActions!: List<Value<string>>;
  AllowResources!: List<Value<string>>;
  AllowReferers?: List<Value<string>>;
  constructor(properties: ApiKeyRestrictions) {
    Object.assign(this, properties);
  }
}
export interface APIKeyProperties {
  KeyName: Value<string>;
  Description?: Value<string>;
  NoExpiry?: Value<boolean>;
  ForceDelete?: Value<boolean>;
  ExpireTime?: Value<string>;
  ForceUpdate?: Value<boolean>;
  Restrictions: ApiKeyRestrictions;
  Tags?: List<ResourceTag>;
}
export default class APIKey extends ResourceBase<APIKeyProperties> {
  static ApiKeyRestrictions = ApiKeyRestrictions;
  constructor(properties: APIKeyProperties) {
    super('AWS::Location::APIKey', properties);
  }
}
