import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class CloudWatchLogs {
  LogGroup?: Value<string>;
  Enabled?: Value<boolean>;
  constructor(properties: CloudWatchLogs) {
    Object.assign(this, properties);
  }
}

export class KinesisDataFirehose {
  DeliveryStream?: Value<string>;
  Enabled?: Value<boolean>;
  constructor(properties: KinesisDataFirehose) {
    Object.assign(this, properties);
  }
}

export class S3 {
  BucketName?: Value<string>;
  Enabled?: Value<boolean>;
  Prefix?: Value<string>;
  BucketOwner?: Value<string>;
  constructor(properties: S3) {
    Object.assign(this, properties);
  }
}

export class VerifiedAccessLogs {
  S3?: S3;
  LogVersion?: Value<string>;
  KinesisDataFirehose?: KinesisDataFirehose;
  CloudWatchLogs?: CloudWatchLogs;
  IncludeTrustContext?: Value<boolean>;
  constructor(properties: VerifiedAccessLogs) {
    Object.assign(this, properties);
  }
}

export class VerifiedAccessTrustProvider {
  Description?: Value<string>;
  DeviceTrustProviderType?: Value<string>;
  VerifiedAccessTrustProviderId?: Value<string>;
  TrustProviderType?: Value<string>;
  UserTrustProviderType?: Value<string>;
  constructor(properties: VerifiedAccessTrustProvider) {
    Object.assign(this, properties);
  }
}
export interface VerifiedAccessInstanceProperties {
  VerifiedAccessTrustProviders?: List<VerifiedAccessTrustProvider>;
  Description?: Value<string>;
  FipsEnabled?: Value<boolean>;
  LoggingConfigurations?: VerifiedAccessLogs;
  CidrEndpointsCustomSubDomain?: Value<string>;
  VerifiedAccessTrustProviderIds?: List<Value<string>>;
  Tags?: List<ResourceTag>;
}
export default class VerifiedAccessInstance extends ResourceBase<VerifiedAccessInstanceProperties> {
  static CloudWatchLogs = CloudWatchLogs;
  static KinesisDataFirehose = KinesisDataFirehose;
  static S3 = S3;
  static VerifiedAccessLogs = VerifiedAccessLogs;
  static VerifiedAccessTrustProvider = VerifiedAccessTrustProvider;
  constructor(properties?: VerifiedAccessInstanceProperties) {
    super('AWS::EC2::VerifiedAccessInstance', properties || {});
  }
}
