import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class SignatureValidityPeriod {
  Type?: Value<string>;
  Value?: Value<number>;
  constructor(properties: SignatureValidityPeriod) {
    Object.assign(this, properties);
  }
}
export interface SigningProfileProperties {
  SignatureValidityPeriod?: SignatureValidityPeriod;
  PlatformId: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class SigningProfile extends ResourceBase<SigningProfileProperties> {
  static SignatureValidityPeriod = SignatureValidityPeriod;
  constructor(properties: SigningProfileProperties) {
    super('AWS::Signer::SigningProfile', properties);
  }
}
