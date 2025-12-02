import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class SAMLPrivateKey {
  KeyId!: Value<string>;
  Timestamp!: Value<string>;
  constructor(properties: SAMLPrivateKey) {
    Object.assign(this, properties);
  }
}
export interface SAMLProviderProperties {
  AddPrivateKey?: Value<string>;
  RemovePrivateKey?: Value<string>;
  AssertionEncryptionMode?: Value<string>;
  SamlMetadataDocument?: Value<string>;
  PrivateKeyList?: List<SAMLPrivateKey>;
  Tags?: List<ResourceTag>;
  Name?: Value<string>;
}
export default class SAMLProvider extends ResourceBase<SAMLProviderProperties> {
  static SAMLPrivateKey = SAMLPrivateKey;
  constructor(properties?: SAMLProviderProperties) {
    super('AWS::IAM::SAMLProvider', properties || {});
  }
}
