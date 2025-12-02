import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class KeyAttributes {
  KeyClass!: Value<string>;
  KeyUsage!: Value<string>;
  KeyModesOfUse!: KeyModesOfUse;
  KeyAlgorithm!: Value<string>;
  constructor(properties: KeyAttributes) {
    Object.assign(this, properties);
  }
}

export class KeyModesOfUse {
  Unwrap?: Value<boolean>;
  Wrap?: Value<boolean>;
  Decrypt?: Value<boolean>;
  NoRestrictions?: Value<boolean>;
  Generate?: Value<boolean>;
  Sign?: Value<boolean>;
  Verify?: Value<boolean>;
  DeriveKey?: Value<boolean>;
  Encrypt?: Value<boolean>;
  constructor(properties: KeyModesOfUse) {
    Object.assign(this, properties);
  }
}
export interface KeyProperties {
  DeriveKeyUsage?: Value<string>;
  Exportable: Value<boolean>;
  KeyAttributes: KeyAttributes;
  Enabled?: Value<boolean>;
  KeyCheckValueAlgorithm?: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class Key extends ResourceBase<KeyProperties> {
  static KeyAttributes = KeyAttributes;
  static KeyModesOfUse = KeyModesOfUse;
  constructor(properties: KeyProperties) {
    super('AWS::PaymentCryptography::Key', properties);
  }
}
