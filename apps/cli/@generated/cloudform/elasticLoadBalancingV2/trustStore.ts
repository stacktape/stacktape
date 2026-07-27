import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface TrustStoreProperties {
  CaCertificatesBundleS3Bucket?: Value<string>;
  CaCertificatesBundleS3ObjectVersion?: Value<string>;
  Tags?: List<ResourceTag>;
  Name?: Value<string>;
  CaCertificatesBundleS3Key?: Value<string>;
}
export default class TrustStore extends ResourceBase<TrustStoreProperties> {
  constructor(properties?: TrustStoreProperties) {
    super('AWS::ElasticLoadBalancingV2::TrustStore', properties || {});
  }
}
