import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class PublicAccessBlockConfiguration {
  RestrictPublicBuckets?: Value<boolean>;
  BlockPublicPolicy?: Value<boolean>;
  BlockPublicAcls?: Value<boolean>;
  IgnorePublicAcls?: Value<boolean>;
  constructor(properties: PublicAccessBlockConfiguration) {
    Object.assign(this, properties);
  }
}

export class Region {
  Bucket!: Value<string>;
  BucketAccountId?: Value<string>;
  constructor(properties: Region) {
    Object.assign(this, properties);
  }
}
export interface MultiRegionAccessPointProperties {
  PublicAccessBlockConfiguration?: PublicAccessBlockConfiguration;
  Regions: List<Region>;
  Name?: Value<string>;
}
export default class MultiRegionAccessPoint extends ResourceBase<MultiRegionAccessPointProperties> {
  static PublicAccessBlockConfiguration = PublicAccessBlockConfiguration;
  static Region = Region;
  constructor(properties: MultiRegionAccessPointProperties) {
    super('AWS::S3::MultiRegionAccessPoint', properties);
  }
}
