import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AutoParticipantRecordingConfiguration {
  StorageConfigurationArn!: Value<string>;
  RecordingReconnectWindowSeconds?: Value<number>;
  MediaTypes?: List<Value<string>>;
  HlsConfiguration?: HlsConfiguration;
  ThumbnailConfiguration?: ThumbnailConfiguration;
  constructor(properties: AutoParticipantRecordingConfiguration) {
    Object.assign(this, properties);
  }
}

export class HlsConfiguration {
  ParticipantRecordingHlsConfiguration?: ParticipantRecordingHlsConfiguration;
  constructor(properties: HlsConfiguration) {
    Object.assign(this, properties);
  }
}

export class ParticipantRecordingHlsConfiguration {
  TargetSegmentDurationSeconds?: Value<number>;
  constructor(properties: ParticipantRecordingHlsConfiguration) {
    Object.assign(this, properties);
  }
}

export class ParticipantThumbnailConfiguration {
  TargetIntervalSeconds?: Value<number>;
  Storage?: List<Value<string>>;
  RecordingMode?: Value<string>;
  constructor(properties: ParticipantThumbnailConfiguration) {
    Object.assign(this, properties);
  }
}

export class ThumbnailConfiguration {
  ParticipantThumbnailConfiguration?: ParticipantThumbnailConfiguration;
  constructor(properties: ThumbnailConfiguration) {
    Object.assign(this, properties);
  }
}
export interface StageProperties {
  AutoParticipantRecordingConfiguration?: AutoParticipantRecordingConfiguration;
  Tags?: List<ResourceTag>;
  Name?: Value<string>;
}
export default class Stage extends ResourceBase<StageProperties> {
  static AutoParticipantRecordingConfiguration = AutoParticipantRecordingConfiguration;
  static HlsConfiguration = HlsConfiguration;
  static ParticipantRecordingHlsConfiguration = ParticipantRecordingHlsConfiguration;
  static ParticipantThumbnailConfiguration = ParticipantThumbnailConfiguration;
  static ThumbnailConfiguration = ThumbnailConfiguration;
  constructor(properties?: StageProperties) {
    super('AWS::IVS::Stage', properties || {});
  }
}
