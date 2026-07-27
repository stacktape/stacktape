import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class VpcOriginEndpointConfig {
  HTTPSPort?: Value<number>;
  OriginSSLProtocols?: List<Value<string>>;
  Arn!: Value<string>;
  HTTPPort?: Value<number>;
  Name!: Value<string>;
  OriginProtocolPolicy?: Value<string>;
  constructor(properties: VpcOriginEndpointConfig) {
    Object.assign(this, properties);
  }
}
export interface VpcOriginProperties {
  VpcOriginEndpointConfig: VpcOriginEndpointConfig;
  Tags?: List<ResourceTag>;
}
export default class VpcOrigin extends ResourceBase<VpcOriginProperties> {
  static VpcOriginEndpointConfig = VpcOriginEndpointConfig;
  constructor(properties: VpcOriginProperties) {
    super('AWS::CloudFront::VpcOrigin', properties);
  }
}
