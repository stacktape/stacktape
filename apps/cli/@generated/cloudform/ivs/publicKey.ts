import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface PublicKeyProperties {
  PublicKeyMaterial?: Value<string>;
  Tags?: List<ResourceTag>;
  Name?: Value<string>;
}
export default class PublicKey extends ResourceBase<PublicKeyProperties> {
  constructor(properties?: PublicKeyProperties) {
    super('AWS::IVS::PublicKey', properties || {});
  }
}
