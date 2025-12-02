import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class BoundingBox {
  Left!: Value<number>;
  Top!: Value<number>;
  Height!: Value<number>;
  Width!: Value<number>;
  constructor(properties: BoundingBox) {
    Object.assign(this, properties);
  }
}

export class ConnectedHomeSettings {
  MinConfidence?: Value<number>;
  Labels!: List<Value<string>>;
  constructor(properties: ConnectedHomeSettings) {
    Object.assign(this, properties);
  }
}

export class DataSharingPreference {
  OptIn!: Value<boolean>;
  constructor(properties: DataSharingPreference) {
    Object.assign(this, properties);
  }
}

export class FaceSearchSettings {
  CollectionId!: Value<string>;
  FaceMatchThreshold?: Value<number>;
  constructor(properties: FaceSearchSettings) {
    Object.assign(this, properties);
  }
}

export class KinesisDataStream {
  Arn!: Value<string>;
  constructor(properties: KinesisDataStream) {
    Object.assign(this, properties);
  }
}

export class KinesisVideoStream {
  Arn!: Value<string>;
  constructor(properties: KinesisVideoStream) {
    Object.assign(this, properties);
  }
}

export class NotificationChannel {
  Arn!: Value<string>;
  constructor(properties: NotificationChannel) {
    Object.assign(this, properties);
  }
}

export class S3Destination {
  BucketName!: Value<string>;
  ObjectKeyPrefix?: Value<string>;
  constructor(properties: S3Destination) {
    Object.assign(this, properties);
  }
}
export interface StreamProcessorProperties {
  S3Destination?: S3Destination;
  DataSharingPreference?: DataSharingPreference;
  KmsKeyId?: Value<string>;
  FaceSearchSettings?: FaceSearchSettings;
  PolygonRegionsOfInterest?: { [key: string]: any };
  RoleArn: Value<string>;
  Name?: Value<string>;
  ConnectedHomeSettings?: ConnectedHomeSettings;
  NotificationChannel?: NotificationChannel;
  KinesisVideoStream: KinesisVideoStream;
  BoundingBoxRegionsOfInterest?: List<BoundingBox>;
  KinesisDataStream?: KinesisDataStream;
  Tags?: List<ResourceTag>;
}
export default class StreamProcessor extends ResourceBase<StreamProcessorProperties> {
  static BoundingBox = BoundingBox;
  static ConnectedHomeSettings = ConnectedHomeSettings;
  static DataSharingPreference = DataSharingPreference;
  static FaceSearchSettings = FaceSearchSettings;
  static KinesisDataStream = KinesisDataStream;
  static KinesisVideoStream = KinesisVideoStream;
  static NotificationChannel = NotificationChannel;
  static S3Destination = S3Destination;
  constructor(properties: StreamProcessorProperties) {
    super('AWS::Rekognition::StreamProcessor', properties);
  }
}
