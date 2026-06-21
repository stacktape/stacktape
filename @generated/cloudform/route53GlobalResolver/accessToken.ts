import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface AccessTokenProperties {
  DnsViewId: Value<string>;
  ExpiresAt?: Value<string>;
  ClientToken?: Value<string>;
  Tags?: List<ResourceTag>;
  Name?: Value<string>;
}
export default class AccessToken extends ResourceBase<AccessTokenProperties> {
  constructor(properties: AccessTokenProperties) {
    super('AWS::Route53GlobalResolver::AccessToken', properties);
  }
}
