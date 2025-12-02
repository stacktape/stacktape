import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class DashBaseUrl {
  ServiceLocation?: Value<string>;
  DvbWeight?: Value<number>;
  DvbPriority?: Value<number>;
  Url!: Value<string>;
  constructor(properties: DashBaseUrl) {
    Object.assign(this, properties);
  }
}

export class DashDvbFontDownload {
  FontFamily?: Value<string>;
  Url?: Value<string>;
  MimeType?: Value<string>;
  constructor(properties: DashDvbFontDownload) {
    Object.assign(this, properties);
  }
}

export class DashDvbMetricsReporting {
  ReportingUrl!: Value<string>;
  Probability?: Value<number>;
  constructor(properties: DashDvbMetricsReporting) {
    Object.assign(this, properties);
  }
}

export class DashDvbSettings {
  FontDownload?: DashDvbFontDownload;
  ErrorMetrics?: List<DashDvbMetricsReporting>;
  constructor(properties: DashDvbSettings) {
    Object.assign(this, properties);
  }
}

export class DashManifestConfiguration {
  ManifestWindowSeconds?: Value<number>;
  DrmSignaling?: Value<string>;
  Compactness?: Value<string>;
  ProgramInformation?: DashProgramInformation;
  FilterConfiguration?: FilterConfiguration;
  SegmentTemplateFormat?: Value<string>;
  BaseUrls?: List<DashBaseUrl>;
  ManifestName!: Value<string>;
  PeriodTriggers?: List<Value<string>>;
  SuggestedPresentationDelaySeconds?: Value<number>;
  UtcTiming?: DashUtcTiming;
  SubtitleConfiguration?: DashSubtitleConfiguration;
  MinBufferTimeSeconds?: Value<number>;
  Profiles?: List<Value<string>>;
  DvbSettings?: DashDvbSettings;
  MinUpdatePeriodSeconds?: Value<number>;
  ScteDash?: ScteDash;
  constructor(properties: DashManifestConfiguration) {
    Object.assign(this, properties);
  }
}

export class DashProgramInformation {
  Copyright?: Value<string>;
  LanguageCode?: Value<string>;
  Title?: Value<string>;
  MoreInformationUrl?: Value<string>;
  Source?: Value<string>;
  constructor(properties: DashProgramInformation) {
    Object.assign(this, properties);
  }
}

export class DashSubtitleConfiguration {
  TtmlConfiguration?: DashTtmlConfiguration;
  constructor(properties: DashSubtitleConfiguration) {
    Object.assign(this, properties);
  }
}

export class DashTtmlConfiguration {
  TtmlProfile!: Value<string>;
  constructor(properties: DashTtmlConfiguration) {
    Object.assign(this, properties);
  }
}

export class DashUtcTiming {
  TimingMode?: Value<string>;
  TimingSource?: Value<string>;
  constructor(properties: DashUtcTiming) {
    Object.assign(this, properties);
  }
}

export class Encryption {
  KeyRotationIntervalSeconds?: Value<number>;
  CmafExcludeSegmentDrmMetadata?: Value<boolean>;
  ConstantInitializationVector?: Value<string>;
  SpekeKeyProvider!: SpekeKeyProvider;
  EncryptionMethod!: EncryptionMethod;
  constructor(properties: Encryption) {
    Object.assign(this, properties);
  }
}

export class EncryptionContractConfiguration {
  PresetSpeke20Audio!: Value<string>;
  PresetSpeke20Video!: Value<string>;
  constructor(properties: EncryptionContractConfiguration) {
    Object.assign(this, properties);
  }
}

export class EncryptionMethod {
  IsmEncryptionMethod?: Value<string>;
  CmafEncryptionMethod?: Value<string>;
  TsEncryptionMethod?: Value<string>;
  constructor(properties: EncryptionMethod) {
    Object.assign(this, properties);
  }
}

export class FilterConfiguration {
  Start?: Value<string>;
  End?: Value<string>;
  TimeDelaySeconds?: Value<number>;
  ClipStartTime?: Value<string>;
  ManifestFilter?: Value<string>;
  constructor(properties: FilterConfiguration) {
    Object.assign(this, properties);
  }
}

export class ForceEndpointErrorConfiguration {
  EndpointErrorConditions?: List<Value<string>>;
  constructor(properties: ForceEndpointErrorConfiguration) {
    Object.assign(this, properties);
  }
}

export class HlsManifestConfiguration {
  ManifestWindowSeconds?: Value<number>;
  ManifestName!: Value<string>;
  ProgramDateTimeIntervalSeconds?: Value<number>;
  ChildManifestName?: Value<string>;
  ScteHls?: ScteHls;
  FilterConfiguration?: FilterConfiguration;
  UrlEncodeChildManifest?: Value<boolean>;
  Url?: Value<string>;
  StartTag?: StartTag;
  constructor(properties: HlsManifestConfiguration) {
    Object.assign(this, properties);
  }
}

export class LowLatencyHlsManifestConfiguration {
  ManifestWindowSeconds?: Value<number>;
  ManifestName!: Value<string>;
  ProgramDateTimeIntervalSeconds?: Value<number>;
  ChildManifestName?: Value<string>;
  ScteHls?: ScteHls;
  FilterConfiguration?: FilterConfiguration;
  UrlEncodeChildManifest?: Value<boolean>;
  Url?: Value<string>;
  StartTag?: StartTag;
  constructor(properties: LowLatencyHlsManifestConfiguration) {
    Object.assign(this, properties);
  }
}

export class MssManifestConfiguration {
  ManifestWindowSeconds?: Value<number>;
  ManifestName!: Value<string>;
  ManifestLayout?: Value<string>;
  FilterConfiguration?: FilterConfiguration;
  constructor(properties: MssManifestConfiguration) {
    Object.assign(this, properties);
  }
}

export class Scte {
  ScteFilter?: List<Value<string>>;
  constructor(properties: Scte) {
    Object.assign(this, properties);
  }
}

export class ScteDash {
  AdMarkerDash?: Value<string>;
  constructor(properties: ScteDash) {
    Object.assign(this, properties);
  }
}

export class ScteHls {
  AdMarkerHls?: Value<string>;
  constructor(properties: ScteHls) {
    Object.assign(this, properties);
  }
}

export class Segment {
  SegmentName?: Value<string>;
  TsUseAudioRenditionGroup?: Value<boolean>;
  IncludeIframeOnlyStreams?: Value<boolean>;
  Scte?: Scte;
  TsIncludeDvbSubtitles?: Value<boolean>;
  SegmentDurationSeconds?: Value<number>;
  Encryption?: Encryption;
  constructor(properties: Segment) {
    Object.assign(this, properties);
  }
}

export class SpekeKeyProvider {
  DrmSystems!: List<Value<string>>;
  ResourceId!: Value<string>;
  EncryptionContractConfiguration!: EncryptionContractConfiguration;
  RoleArn!: Value<string>;
  Url!: Value<string>;
  constructor(properties: SpekeKeyProvider) {
    Object.assign(this, properties);
  }
}

export class StartTag {
  Precise?: Value<boolean>;
  TimeOffset!: Value<number>;
  constructor(properties: StartTag) {
    Object.assign(this, properties);
  }
}
export interface OriginEndpointProperties {
  MssManifests?: List<MssManifestConfiguration>;
  Description?: Value<string>;
  LowLatencyHlsManifests?: List<LowLatencyHlsManifestConfiguration>;
  ContainerType: Value<string>;
  ForceEndpointErrorConfiguration?: ForceEndpointErrorConfiguration;
  HlsManifests?: List<HlsManifestConfiguration>;
  DashManifests?: List<DashManifestConfiguration>;
  Segment?: Segment;
  ChannelName: Value<string>;
  OriginEndpointName: Value<string>;
  ChannelGroupName: Value<string>;
  Tags?: List<ResourceTag>;
  StartoverWindowSeconds?: Value<number>;
}
export default class OriginEndpoint extends ResourceBase<OriginEndpointProperties> {
  static DashBaseUrl = DashBaseUrl;
  static DashDvbFontDownload = DashDvbFontDownload;
  static DashDvbMetricsReporting = DashDvbMetricsReporting;
  static DashDvbSettings = DashDvbSettings;
  static DashManifestConfiguration = DashManifestConfiguration;
  static DashProgramInformation = DashProgramInformation;
  static DashSubtitleConfiguration = DashSubtitleConfiguration;
  static DashTtmlConfiguration = DashTtmlConfiguration;
  static DashUtcTiming = DashUtcTiming;
  static Encryption = Encryption;
  static EncryptionContractConfiguration = EncryptionContractConfiguration;
  static EncryptionMethod = EncryptionMethod;
  static FilterConfiguration = FilterConfiguration;
  static ForceEndpointErrorConfiguration = ForceEndpointErrorConfiguration;
  static HlsManifestConfiguration = HlsManifestConfiguration;
  static LowLatencyHlsManifestConfiguration = LowLatencyHlsManifestConfiguration;
  static MssManifestConfiguration = MssManifestConfiguration;
  static Scte = Scte;
  static ScteDash = ScteDash;
  static ScteHls = ScteHls;
  static Segment = Segment;
  static SpekeKeyProvider = SpekeKeyProvider;
  static StartTag = StartTag;
  constructor(properties: OriginEndpointProperties) {
    super('AWS::MediaPackageV2::OriginEndpoint', properties);
  }
}
