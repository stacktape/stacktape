import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class DestinationConfiguration {
  S3?: S3DestinationConfiguration;
  constructor(properties: DestinationConfiguration) {
    Object.assign(this, properties);
  }
}

export class RenditionConfiguration {
  RenditionSelection?: Value<string>;
  Renditions?: List<Value<string>>;
  constructor(properties: RenditionConfiguration) {
    Object.assign(this, properties);
  }
}

export class S3DestinationConfiguration {
  BucketName!: Value<string>;
  constructor(properties: S3DestinationConfiguration) {
    Object.assign(this, properties);
  }
}

export class ThumbnailConfiguration {
  TargetIntervalSeconds?: Value<number>;
  Storage?: List<Value<string>>;
  RecordingMode?: Value<string>;
  Resolution?: Value<string>;
  constructor(properties: ThumbnailConfiguration) {
    Object.assign(this, properties);
  }
}
export interface RecordingConfigurationProperties {
  DestinationConfiguration: DestinationConfiguration;
  RenditionConfiguration?: RenditionConfiguration;
  RecordingReconnectWindowSeconds?: Value<number>;
  Tags?: List<ResourceTag>;
  ThumbnailConfiguration?: ThumbnailConfiguration;
  Name?: Value<string>;
}
export default class RecordingConfiguration extends ResourceBase<RecordingConfigurationProperties> {
  static DestinationConfiguration = DestinationConfiguration;
  static RenditionConfiguration = RenditionConfiguration;
  static S3DestinationConfiguration = S3DestinationConfiguration;
  static ThumbnailConfiguration = ThumbnailConfiguration;
  constructor(properties: RecordingConfigurationProperties) {
    super('AWS::IVS::RecordingConfiguration', properties);
  }
}
