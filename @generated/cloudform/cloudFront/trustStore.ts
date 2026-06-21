import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class CaCertificatesBundleS3Location {
  Bucket!: Value<string>;
  Version?: Value<string>;
  Region!: Value<string>;
  Key!: Value<string>;
  constructor(properties: CaCertificatesBundleS3Location) {
    Object.assign(this, properties);
  }
}

export class CaCertificatesBundleSource {
  CaCertificatesBundleS3Location!: CaCertificatesBundleS3Location;
  constructor(properties: CaCertificatesBundleSource) {
    Object.assign(this, properties);
  }
}
export interface TrustStoreProperties {
  CaCertificatesBundleSource?: CaCertificatesBundleSource;
  UseClientCertificateOCSPEndpoint?: Value<boolean>;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
}
export default class TrustStore extends ResourceBase<TrustStoreProperties> {
  static CaCertificatesBundleS3Location = CaCertificatesBundleS3Location;
  static CaCertificatesBundleSource = CaCertificatesBundleSource;
  constructor(properties: TrustStoreProperties) {
    super('AWS::CloudFront::TrustStore', properties);
  }
}
