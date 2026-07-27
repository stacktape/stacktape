import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class RevocationContent {
  S3ObjectVersion?: Value<string>;
  S3Bucket?: Value<string>;
  S3Key?: Value<string>;
  RevocationType?: Value<string>;
  constructor(properties: RevocationContent) {
    Object.assign(this, properties);
  }
}

export class TrustStoreRevocationInner {
  NumberOfRevokedEntries?: Value<number>;
  TrustStoreArn?: Value<string>;
  RevocationType?: Value<string>;
  RevocationId?: Value<string>;
  constructor(properties: TrustStoreRevocationInner) {
    Object.assign(this, properties);
  }
}
export interface TrustStoreRevocationProperties {
  RevocationContents?: List<RevocationContent>;
  TrustStoreArn?: Value<string>;
}
export default class TrustStoreRevocation extends ResourceBase<TrustStoreRevocationProperties> {
  static RevocationContent = RevocationContent;
  static TrustStoreRevocation = TrustStoreRevocationInner;
  constructor(properties?: TrustStoreRevocationProperties) {
    super('AWS::ElasticLoadBalancingV2::TrustStoreRevocation', properties || {});
  }
}
