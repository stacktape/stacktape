import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class Logging {
  Bucket!: Value<string>;
  Enabled!: Value<boolean>;
  Prefix!: Value<string>;
  constructor(properties: Logging) {
    Object.assign(this, properties);
  }
}

export class S3Origin {
  DomainName!: Value<string>;
  OriginAccessIdentity!: Value<string>;
  constructor(properties: S3Origin) {
    Object.assign(this, properties);
  }
}

export class StreamingDistributionConfig {
  Logging?: Logging;
  Comment!: Value<string>;
  PriceClass?: Value<string>;
  S3Origin!: S3Origin;
  Enabled!: Value<boolean>;
  Aliases?: List<Value<string>>;
  TrustedSigners!: TrustedSigners;
  constructor(properties: StreamingDistributionConfig) {
    Object.assign(this, properties);
  }
}

export class TrustedSigners {
  Enabled!: Value<boolean>;
  AwsAccountNumbers?: List<Value<string>>;
  constructor(properties: TrustedSigners) {
    Object.assign(this, properties);
  }
}
export interface StreamingDistributionProperties {
  StreamingDistributionConfig: StreamingDistributionConfig;
  Tags: List<ResourceTag>;
}
export default class StreamingDistribution extends ResourceBase<StreamingDistributionProperties> {
  static Logging = Logging;
  static S3Origin = S3Origin;
  static StreamingDistributionConfig = StreamingDistributionConfig;
  static TrustedSigners = TrustedSigners;
  constructor(properties: StreamingDistributionProperties) {
    super('AWS::CloudFront::StreamingDistribution', properties);
  }
}
