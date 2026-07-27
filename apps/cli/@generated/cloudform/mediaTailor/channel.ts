import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class DashPlaylistSettings {
  ManifestWindowSeconds?: Value<number>;
  SuggestedPresentationDelaySeconds?: Value<number>;
  MinBufferTimeSeconds?: Value<number>;
  MinUpdatePeriodSeconds?: Value<number>;
  constructor(properties: DashPlaylistSettings) {
    Object.assign(this, properties);
  }
}

export class HlsPlaylistSettings {
  ManifestWindowSeconds?: Value<number>;
  AdMarkupType?: List<Value<string>>;
  constructor(properties: HlsPlaylistSettings) {
    Object.assign(this, properties);
  }
}

export class LogConfigurationForChannel {
  LogTypes?: List<Value<string>>;
  constructor(properties: LogConfigurationForChannel) {
    Object.assign(this, properties);
  }
}

export class RequestOutputItem {
  ManifestName!: Value<string>;
  DashPlaylistSettings?: DashPlaylistSettings;
  HlsPlaylistSettings?: HlsPlaylistSettings;
  SourceGroup!: Value<string>;
  constructor(properties: RequestOutputItem) {
    Object.assign(this, properties);
  }
}

export class SlateSource {
  VodSourceName?: Value<string>;
  SourceLocationName?: Value<string>;
  constructor(properties: SlateSource) {
    Object.assign(this, properties);
  }
}

export class TimeShiftConfiguration {
  MaxTimeDelaySeconds!: Value<number>;
  constructor(properties: TimeShiftConfiguration) {
    Object.assign(this, properties);
  }
}
export interface ChannelProperties {
  FillerSlate?: SlateSource;
  ChannelName: Value<string>;
  Tier?: Value<string>;
  Audiences?: List<Value<string>>;
  Outputs: List<RequestOutputItem>;
  LogConfiguration?: LogConfigurationForChannel;
  PlaybackMode: Value<string>;
  Tags?: List<ResourceTag>;
  TimeShiftConfiguration?: TimeShiftConfiguration;
}
export default class Channel extends ResourceBase<ChannelProperties> {
  static DashPlaylistSettings = DashPlaylistSettings;
  static HlsPlaylistSettings = HlsPlaylistSettings;
  static LogConfigurationForChannel = LogConfigurationForChannel;
  static RequestOutputItem = RequestOutputItem;
  static SlateSource = SlateSource;
  static TimeShiftConfiguration = TimeShiftConfiguration;
  constructor(properties: ChannelProperties) {
    super('AWS::MediaTailor::Channel', properties);
  }
}
