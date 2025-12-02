import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class CmafEncryption {
  SpekeKeyProvider!: SpekeKeyProvider;
  constructor(properties: CmafEncryption) {
    Object.assign(this, properties);
  }
}

export class CmafPackage {
  SegmentDurationSeconds?: Value<number>;
  Encryption?: CmafEncryption;
  HlsManifests!: List<HlsManifest>;
  IncludeEncoderConfigurationInSegments?: Value<boolean>;
  constructor(properties: CmafPackage) {
    Object.assign(this, properties);
  }
}

export class DashEncryption {
  SpekeKeyProvider!: SpekeKeyProvider;
  constructor(properties: DashEncryption) {
    Object.assign(this, properties);
  }
}

export class DashManifest {
  ScteMarkersSource?: Value<string>;
  ManifestName?: Value<string>;
  ManifestLayout?: Value<string>;
  StreamSelection?: StreamSelection;
  MinBufferTimeSeconds?: Value<number>;
  Profile?: Value<string>;
  constructor(properties: DashManifest) {
    Object.assign(this, properties);
  }
}

export class DashPackage {
  PeriodTriggers?: List<Value<string>>;
  IncludeIframeOnlyStream?: Value<boolean>;
  SegmentDurationSeconds?: Value<number>;
  Encryption?: DashEncryption;
  SegmentTemplateFormat?: Value<string>;
  IncludeEncoderConfigurationInSegments?: Value<boolean>;
  DashManifests!: List<DashManifest>;
  constructor(properties: DashPackage) {
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

export class HlsEncryption {
  ConstantInitializationVector?: Value<string>;
  SpekeKeyProvider!: SpekeKeyProvider;
  EncryptionMethod?: Value<string>;
  constructor(properties: HlsEncryption) {
    Object.assign(this, properties);
  }
}

export class HlsManifest {
  AdMarkers?: Value<string>;
  ManifestName?: Value<string>;
  ProgramDateTimeIntervalSeconds?: Value<number>;
  StreamSelection?: StreamSelection;
  RepeatExtXKey?: Value<boolean>;
  IncludeIframeOnlyStream?: Value<boolean>;
  constructor(properties: HlsManifest) {
    Object.assign(this, properties);
  }
}

export class HlsPackage {
  UseAudioRenditionGroup?: Value<boolean>;
  SegmentDurationSeconds?: Value<number>;
  Encryption?: HlsEncryption;
  HlsManifests!: List<HlsManifest>;
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

export class MssManifest {
  ManifestName?: Value<string>;
  StreamSelection?: StreamSelection;
  constructor(properties: MssManifest) {
    Object.assign(this, properties);
  }
}

export class MssPackage {
  MssManifests!: List<MssManifest>;
  SegmentDurationSeconds?: Value<number>;
  Encryption?: MssEncryption;
  constructor(properties: MssPackage) {
    Object.assign(this, properties);
  }
}

export class SpekeKeyProvider {
  SystemIds!: List<Value<string>>;
  EncryptionContractConfiguration?: EncryptionContractConfiguration;
  RoleArn!: Value<string>;
  Url!: Value<string>;
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
export interface PackagingConfigurationProperties {
  MssPackage?: MssPackage;
  CmafPackage?: CmafPackage;
  Id: Value<string>;
  HlsPackage?: HlsPackage;
  PackagingGroupId: Value<string>;
  DashPackage?: DashPackage;
  Tags?: List<ResourceTag>;
}
export default class PackagingConfiguration extends ResourceBase<PackagingConfigurationProperties> {
  static CmafEncryption = CmafEncryption;
  static CmafPackage = CmafPackage;
  static DashEncryption = DashEncryption;
  static DashManifest = DashManifest;
  static DashPackage = DashPackage;
  static EncryptionContractConfiguration = EncryptionContractConfiguration;
  static HlsEncryption = HlsEncryption;
  static HlsManifest = HlsManifest;
  static HlsPackage = HlsPackage;
  static MssEncryption = MssEncryption;
  static MssManifest = MssManifest;
  static MssPackage = MssPackage;
  static SpekeKeyProvider = SpekeKeyProvider;
  static StreamSelection = StreamSelection;
  constructor(properties: PackagingConfigurationProperties) {
    super('AWS::MediaPackage::PackagingConfiguration', properties);
  }
}
