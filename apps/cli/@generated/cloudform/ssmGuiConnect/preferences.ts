import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class ConnectionRecordingPreferences {
  KMSKeyArn!: Value<string>;
  RecordingDestinations!: RecordingDestinations;
  constructor(properties: ConnectionRecordingPreferences) {
    Object.assign(this, properties);
  }
}

export class RecordingDestinations {
  S3Buckets!: List<S3Bucket>;
  constructor(properties: RecordingDestinations) {
    Object.assign(this, properties);
  }
}

export class S3Bucket {
  BucketName!: Value<string>;
  BucketOwner!: Value<string>;
  constructor(properties: S3Bucket) {
    Object.assign(this, properties);
  }
}
export interface PreferencesProperties {
  ConnectionRecordingPreferences?: ConnectionRecordingPreferences;
}
export default class Preferences extends ResourceBase<PreferencesProperties> {
  static ConnectionRecordingPreferences = ConnectionRecordingPreferences;
  static RecordingDestinations = RecordingDestinations;
  static S3Bucket = S3Bucket;
  constructor(properties?: PreferencesProperties) {
    super('AWS::SSMGuiConnect::Preferences', properties || {});
  }
}
