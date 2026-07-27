import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class CloudFrontOriginAccessIdentityConfig {
  Comment!: Value<string>;
  constructor(properties: CloudFrontOriginAccessIdentityConfig) {
    Object.assign(this, properties);
  }
}
export interface CloudFrontOriginAccessIdentityProperties {
  CloudFrontOriginAccessIdentityConfig: CloudFrontOriginAccessIdentityConfig;
}
export default class CloudFrontOriginAccessIdentity extends ResourceBase<CloudFrontOriginAccessIdentityProperties> {
  static CloudFrontOriginAccessIdentityConfig = CloudFrontOriginAccessIdentityConfig;
  constructor(properties: CloudFrontOriginAccessIdentityProperties) {
    super('AWS::CloudFront::CloudFrontOriginAccessIdentity', properties);
  }
}
