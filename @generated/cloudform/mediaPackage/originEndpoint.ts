import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class Authorization {
  SecretsRoleArn!: Value<string>;
  CdnIdentifierSecret!: Value<string>;
  constructor(properties: Authorization) {
    Object.assign(this, properties);
  }
}

export class CmafEncryption {
  KeyRotationIntervalSeconds?: Value<number>;
  SpekeKeyProvider!: SpekeKeyProvider;
  ConstantInitializationVector?: Value<string>;
  EncryptionMethod?: Value<string>;
  constructor(properties: CmafEncryption) {
    Object.assign(this, properties);
  }
}

export class CmafPackage {
  SegmentPrefix?: Value<string>;
  StreamSelection?: StreamSelection;
  SegmentDurationSeconds?: Value<number>;
  Encryption?: CmafEncryption;
  HlsManifests?: List<HlsManifest>;
  constructor(properties: CmafPackage) {
    Object.assign(this, properties);
  }
}

export class DashEncryption {
  KeyRotationIntervalSeconds?: Value<number>;
  SpekeKeyProvider!: SpekeKeyProvider;
  constructor(properties: DashEncryption) {
    Object.assign(this, properties);
  }
}

export class DashPackage {
  ManifestWindowSeconds?: Value<number>;
  AdsOnDeliveryRestrictions?: Value<string>;
  ManifestLayout?: Value<string>;
  StreamSelection?: StreamSelection;
  IncludeIframeOnlyStream?: Value<boolean>;
  SegmentTemplateFormat?: Value<string>;
  Encryption?: DashEncryption;
  AdTriggers?: List<Value<string>>;
  Profile?: Value<string>;
  PeriodTriggers?: List<Value<string>>;
  SuggestedPresentationDelaySeconds?: Value<number>;
  UtcTiming?: Value<string>;
  MinBufferTimeSeconds?: Value<number>;
  SegmentDurationSeconds?: Value<number>;
  MinUpdatePeriodSeconds?: Value<number>;
  UtcTimingUri?: Value<string>;
  constructor(properties: DashPackage) {
    Object.assign(this, properties);
  }
}

export class EncryptionContractConfiguration {
  constructor(properties: EncryptionContractConfiguration) {
    Object.assign(this, properties);
  }
}

export class HlsEncryption {
  KeyRotationIntervalSeconds?: Value<number>;
  RepeatExtXKey?: Value<boolean>;
  ConstantInitializationVector?: Value<string>;
  SpekeKeyProvider!: SpekeKeyProvider;
  EncryptionMethod?: Value<string>;
  constructor(properties: HlsEncryption) {
    Object.assign(this, properties);
  }
}

export class HlsManifest {
  AdsOnDeliveryRestrictions?: Value<string>;
  ManifestName?: Value<string>;
  AdMarkers?: Value<string>;
  ProgramDateTimeIntervalSeconds?: Value<number>;
  PlaylistWindowSeconds?: Value<number>;
  IncludeIframeOnlyStream?: Value<boolean>;
  Id!: Value<string>;
  PlaylistType?: Value<string>;
  AdTriggers?: List<Value<string>>;
  Url?: Value<string>;
  constructor(properties: HlsManifest) {
    Object.assign(this, properties);
  }
}

export class HlsPackage {
  AdsOnDeliveryRestrictions?: Value<string>;
  AdMarkers?: Value<string>;
  ProgramDateTimeIntervalSeconds?: Value<number>;
  StreamSelection?: StreamSelection;
  PlaylistWindowSeconds?: Value<number>;
  IncludeIframeOnlyStream?: Value<boolean>;
  UseAudioRenditionGroup?: Value<boolean>;
  SegmentDurationSeconds?: Value<number>;
  Encryption?: HlsEncryption;
  PlaylistType?: Value<string>;
  AdTriggers?: List<Value<string>>;
  IncludeDvbSubtitles?: Value<boolean>;
  constructor(properties: HlsPackage) {
    Object.assign(this, properties);
  }
}

export class MssEncryption {
  SpekeKeyProvider!: SpekeKeyProvider;
  constructor(properties: MssEncryption) {
    Object.assign(this, properties);
  }
}

export class MssPackage {
  ManifestWindowSeconds?: Value<number>;
  StreamSelection?: StreamSelection;
  SegmentDurationSeconds?: Value<number>;
  Encryption?: MssEncryption;
  constructor(properties: MssPackage) {
    Object.assign(this, properties);
  }
}

export class SpekeKeyProvider {
  ResourceId!: Value<string>;
  SystemIds!: List<Value<string>>;
  EncryptionContractConfiguration?: EncryptionContractConfiguration;
  Url!: Value<string>;
  RoleArn!: Value<string>;
  CertificateArn?: Value<string>;
  constructor(properties: SpekeKeyProvider) {
    Object.assign(this, properties);
  }
}

export class StreamSelection {
  MinVideoBitsPerSecond?: Value<number>;
  StreamOrder?: Value<string>;
  MaxVideoBitsPerSecond?: Value<number>;
  constructor(properties: StreamSelection) {
    Object.assign(this, properties);
  }
}
export interface OriginEndpointProperties {
  MssPackage?: MssPackage;
  Description?: Value<string>;
  ChannelId: Value<string>;
  TimeDelaySeconds?: Value<number>;
  Origination?: Value<string>;
  Authorization?: Authorization;
  ManifestName?: Value<string>;
  CmafPackage?: CmafPackage;
  Whitelist?: List<Value<string>>;
  Id: Value<string>;
  HlsPackage?: HlsPackage;
  DashPackage?: DashPackage;
  Tags?: List<ResourceTag>;
  StartoverWindowSeconds?: Value<number>;
}
export default class OriginEndpoint extends ResourceBase<OriginEndpointProperties> {
  static Authorization = Authorization;
  static CmafEncryption = CmafEncryption;
  static CmafPackage = CmafPackage;
  static DashEncryption = DashEncryption;
  static DashPackage = DashPackage;
  static EncryptionContractConfiguration = EncryptionContractConfiguration;
  static HlsEncryption = HlsEncryption;
  static HlsManifest = HlsManifest;
  static HlsPackage = HlsPackage;
  static MssEncryption = MssEncryption;
  static MssPackage = MssPackage;
  static SpekeKeyProvider = SpekeKeyProvider;
  static StreamSelection = StreamSelection;
  constructor(properties: OriginEndpointProperties) {
    super('AWS::MediaPackage::OriginEndpoint', properties);
  }
}
