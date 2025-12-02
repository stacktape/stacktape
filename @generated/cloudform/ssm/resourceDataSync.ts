import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class AwsOrganizationsSource {
  OrganizationSourceType!: Value<string>;
  OrganizationalUnits?: List<Value<string>>;
  constructor(properties: AwsOrganizationsSource) {
    Object.assign(this, properties);
  }
}

export class S3Destination {
  KMSKeyArn?: Value<string>;
  BucketName!: Value<string>;
  BucketRegion!: Value<string>;
  SyncFormat!: Value<string>;
  BucketPrefix?: Value<string>;
  constructor(properties: S3Destination) {
    Object.assign(this, properties);
  }
}

export class SyncSource {
  SourceType!: Value<string>;
  AwsOrganizationsSource?: AwsOrganizationsSource;
  IncludeFutureRegions?: Value<boolean>;
  SourceRegions!: List<Value<string>>;
  constructor(properties: SyncSource) {
    Object.assign(this, properties);
  }
}
export interface ResourceDataSyncProperties {
  S3Destination?: S3Destination;
  KMSKeyArn?: Value<string>;
  SyncSource?: SyncSource;
  BucketName?: Value<string>;
  BucketRegion?: Value<string>;
  SyncFormat?: Value<string>;
  SyncName: Value<string>;
  SyncType?: Value<string>;
  BucketPrefix?: Value<string>;
}
export default class ResourceDataSync extends ResourceBase<ResourceDataSyncProperties> {
  static AwsOrganizationsSource = AwsOrganizationsSource;
  static S3Destination = S3Destination;
  static SyncSource = SyncSource;
  constructor(properties: ResourceDataSyncProperties) {
    super('AWS::SSM::ResourceDataSync', properties);
  }
}
