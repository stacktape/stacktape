import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AdConditioningConfiguration {
  StreamingMediaFileConditioning!: Value<string>;
  constructor(properties: AdConditioningConfiguration) {
    Object.assign(this, properties);
  }
}

export class AdMarkerPassthrough {
  Enabled?: Value<boolean>;
  constructor(properties: AdMarkerPassthrough) {
    Object.assign(this, properties);
  }
}

export class AdsInteractionLog {
  ExcludeEventTypes?: List<Value<string>>;
  PublishOptInEventTypes?: List<Value<string>>;
  constructor(properties: AdsInteractionLog) {
    Object.assign(this, properties);
  }
}

export class AvailSuppression {
  Mode?: Value<string>;
  Value?: Value<string>;
  FillPolicy?: Value<string>;
  constructor(properties: AvailSuppression) {
    Object.assign(this, properties);
  }
}

export class Bumper {
  StartUrl?: Value<string>;
  EndUrl?: Value<string>;
  constructor(properties: Bumper) {
    Object.assign(this, properties);
  }
}

export class CdnConfiguration {
  AdSegmentUrlPrefix?: Value<string>;
  ContentSegmentUrlPrefix?: Value<string>;
  constructor(properties: CdnConfiguration) {
    Object.assign(this, properties);
  }
}

export class DashConfiguration {
  MpdLocation?: Value<string>;
  ManifestEndpointPrefix?: Value<string>;
  OriginManifestType?: Value<string>;
  constructor(properties: DashConfiguration) {
    Object.assign(this, properties);
  }
}

export class HlsConfiguration {
  ManifestEndpointPrefix?: Value<string>;
  constructor(properties: HlsConfiguration) {
    Object.assign(this, properties);
  }
}

export class LivePreRollConfiguration {
  AdDecisionServerUrl?: Value<string>;
  MaxDurationSeconds?: Value<number>;
  constructor(properties: LivePreRollConfiguration) {
    Object.assign(this, properties);
  }
}

export class LogConfiguration {
  EnabledLoggingStrategies?: List<Value<string>>;
  PercentEnabled!: Value<number>;
  AdsInteractionLog?: AdsInteractionLog;
  ManifestServiceInteractionLog?: ManifestServiceInteractionLog;
  constructor(properties: LogConfiguration) {
    Object.assign(this, properties);
  }
}

export class ManifestProcessingRules {
  AdMarkerPassthrough?: AdMarkerPassthrough;
  constructor(properties: ManifestProcessingRules) {
    Object.assign(this, properties);
  }
}

export class ManifestServiceInteractionLog {
  ExcludeEventTypes?: List<Value<string>>;
  constructor(properties: ManifestServiceInteractionLog) {
    Object.assign(this, properties);
  }
}
export interface PlaybackConfigurationProperties {
  Bumper?: Bumper;
  DashConfiguration?: DashConfiguration;
  InsertionMode?: Value<string>;
  CdnConfiguration?: CdnConfiguration;
  ManifestProcessingRules?: ManifestProcessingRules;
  PersonalizationThresholdSeconds?: Value<number>;
  LivePreRollConfiguration?: LivePreRollConfiguration;
  HlsConfiguration?: HlsConfiguration;
  LogConfiguration?: LogConfiguration;
  VideoContentSourceUrl: Value<string>;
  Name: Value<string>;
  TranscodeProfileName?: Value<string>;
  ConfigurationAliases?: { [key: string]: { [key: string]: any } };
  AdDecisionServerUrl: Value<string>;
  AdConditioningConfiguration?: AdConditioningConfiguration;
  SlateAdUrl?: Value<string>;
  AvailSuppression?: AvailSuppression;
  Tags?: List<ResourceTag>;
}
export default class PlaybackConfiguration extends ResourceBase<PlaybackConfigurationProperties> {
  static AdConditioningConfiguration = AdConditioningConfiguration;
  static AdMarkerPassthrough = AdMarkerPassthrough;
  static AdsInteractionLog = AdsInteractionLog;
  static AvailSuppression = AvailSuppression;
  static Bumper = Bumper;
  static CdnConfiguration = CdnConfiguration;
  static DashConfiguration = DashConfiguration;
  static HlsConfiguration = HlsConfiguration;
  static LivePreRollConfiguration = LivePreRollConfiguration;
  static LogConfiguration = LogConfiguration;
  static ManifestProcessingRules = ManifestProcessingRules;
  static ManifestServiceInteractionLog = ManifestServiceInteractionLog;
  constructor(properties: PlaybackConfigurationProperties) {
    super('AWS::MediaTailor::PlaybackConfiguration', properties);
  }
}
