import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class OriginAccessControlConfig {
  SigningBehavior!: Value<string>;
  Description?: Value<string>;
  OriginAccessControlOriginType!: Value<string>;
  SigningProtocol!: Value<string>;
  Name!: Value<string>;
  constructor(properties: OriginAccessControlConfig) {
    Object.assign(this, properties);
  }
}
export interface OriginAccessControlProperties {
  OriginAccessControlConfig: OriginAccessControlConfig;
}
export default class OriginAccessControl extends ResourceBase<OriginAccessControlProperties> {
  static OriginAccessControlConfig = OriginAccessControlConfig;
  constructor(properties: OriginAccessControlProperties) {
    super('AWS::CloudFront::OriginAccessControl', properties);
  }
}
