import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface IdentityProviderProperties {
  IdentityProviderDetails: { [key: string]: Value<string> };
  PortalArn?: Value<string>;
  IdentityProviderName: Value<string>;
  IdentityProviderType: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class IdentityProvider extends ResourceBase<IdentityProviderProperties> {
  constructor(properties: IdentityProviderProperties) {
    super('AWS::WorkSpacesWeb::IdentityProvider', properties);
  }
}
