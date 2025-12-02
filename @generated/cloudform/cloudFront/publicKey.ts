import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class PublicKeyConfig {
  Comment?: Value<string>;
  CallerReference!: Value<string>;
  EncodedKey!: Value<string>;
  Name!: Value<string>;
  constructor(properties: PublicKeyConfig) {
    Object.assign(this, properties);
  }
}
export interface PublicKeyProperties {
  PublicKeyConfig: PublicKeyConfig;
}
export default class PublicKey extends ResourceBase<PublicKeyProperties> {
  static PublicKeyConfig = PublicKeyConfig;
  constructor(properties: PublicKeyProperties) {
    super('AWS::CloudFront::PublicKey', properties);
  }
}
