import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class AudioMonitoringSetting {
  SilentAudio?: SilentAudio;
  constructor(properties: AudioMonitoringSetting) {
    Object.assign(this, properties);
  }
}

export class BlackFrames {
  State?: Value<string>;
  ThresholdSeconds?: Value<number>;
  constructor(properties: BlackFrames) {
    Object.assign(this, properties);
  }
}

export class Encryption {
  SecretArn?: Value<string>;
  KeyType?: Value<string>;
  ResourceId?: Value<string>;
  DeviceId?: Value<string>;
  Region?: Value<string>;
  ConstantInitializationVector?: Value<string>;
  Algorithm?: Value<string>;
  RoleArn!: Value<string>;
  Url?: Value<string>;
  constructor(properties: Encryption) {
    Object.assign(this, properties);
  }
}

export class FailoverConfig {
  State?: Value<string>;
  SourcePriority?: SourcePriority;
  FailoverMode?: Value<string>;
  RecoveryWindow?: Value<number>;
  constructor(properties: FailoverConfig) {
    Object.assign(this, properties);
  }
}

export class Fmtp {
  Par?: Value<string>;
  ScanMode?: Value<string>;
  Tcs?: Value<string>;
  ExactFramerate?: Value<string>;
  ChannelOrder?: Value<string>;
  Colorimetry?: Value<string>;
  Range?: Value<string>;
  constructor(properties: Fmtp) {
    Object.assign(this, properties);
  }
}

export class FrozenFrames {
  State?: Value<string>;
  ThresholdSeconds?: Value<number>;
  constructor(properties: FrozenFrames) {
    Object.assign(this, properties);
  }
}

export class GatewayBridgeSource {
  BridgeArn!: Value<string>;
  VpcInterfaceAttachment?: VpcInterfaceAttachment;
  constructor(properties: GatewayBridgeSource) {
    Object.assign(this, properties);
  }
}

export class InputConfiguration {
  InputPort!: Value<number>;
  Interface!: Interface;
  constructor(properties: InputConfiguration) {
    Object.assign(this, properties);
  }
}

export class Interface {
  Name!: Value<string>;
  constructor(properties: Interface) {
    Object.assign(this, properties);
  }
}

export class Maintenance {
  MaintenanceDay!: Value<string>;
  MaintenanceStartHour!: Value<string>;
  constructor(properties: Maintenance) {
    Object.assign(this, properties);
  }
}

export class MediaStream {
  MediaStreamType!: Value<string>;
  MediaStreamId!: Value<number>;
  Description?: Value<string>;
  MediaStreamName!: Value<string>;
  Attributes?: MediaStreamAttributes;
  ClockRate?: Value<number>;
  VideoFormat?: Value<string>;
  Fmt?: Value<number>;
  constructor(properties: MediaStream) {
    Object.assign(this, properties);
  }
}

export class MediaStreamAttributes {
  Fmtp?: Fmtp;
  Lang?: Value<string>;
  constructor(properties: MediaStreamAttributes) {
    Object.assign(this, properties);
  }
}

export class MediaStreamSourceConfiguration {
  MediaStreamName!: Value<string>;
  InputConfigurations?: List<InputConfiguration>;
  EncodingName!: Value<string>;
  constructor(properties: MediaStreamSourceConfiguration) {
    Object.assign(this, properties);
  }
}

export class NdiConfig {
  NdiState?: Value<string>;
  MachineName?: Value<string>;
  NdiDiscoveryServers?: List<NdiDiscoveryServerConfig>;
  constructor(properties: NdiConfig) {
    Object.assign(this, properties);
  }
}

export class NdiDiscoveryServerConfig {
  DiscoveryServerAddress!: Value<string>;
  DiscoveryServerPort?: Value<number>;
  VpcInterfaceAdapter!: Value<string>;
  constructor(properties: NdiDiscoveryServerConfig) {
    Object.assign(this, properties);
  }
}

export class SilentAudio {
  State?: Value<string>;
  ThresholdSeconds?: Value<number>;
  constructor(properties: SilentAudio) {
    Object.assign(this, properties);
  }
}

export class Source {
  IngestIp?: Value<string>;
  MaxSyncBuffer?: Value<number>;
  StreamId?: Value<string>;
  Description?: Value<string>;
  SenderIpAddress?: Value<string>;
  MediaStreamSourceConfigurations?: List<MediaStreamSourceConfiguration>;
  IngestPort?: Value<number>;
  SenderControlPort?: Value<number>;
  Decryption?: Encryption;
  GatewayBridgeSource?: GatewayBridgeSource;
  SourceListenerAddress?: Value<string>;
  SourceListenerPort?: Value<number>;
  Name?: Value<string>;
  WhitelistCidr?: Value<string>;
  EntitlementArn?: Value<string>;
  SourceArn?: Value<string>;
  MinLatency?: Value<number>;
  VpcInterfaceName?: Value<string>;
  MaxBitrate?: Value<number>;
  Protocol?: Value<string>;
  MaxLatency?: Value<number>;
  SourceIngestPort?: Value<string>;
  constructor(properties: Source) {
    Object.assign(this, properties);
  }
}

export class SourceMonitoringConfig {
  ContentQualityAnalysisState?: Value<string>;
  AudioMonitoringSettings?: List<AudioMonitoringSetting>;
  VideoMonitoringSettings?: List<VideoMonitoringSetting>;
  ThumbnailState?: Value<string>;
  constructor(properties: SourceMonitoringConfig) {
    Object.assign(this, properties);
  }
}

export class SourcePriority {
  PrimarySource!: Value<string>;
  constructor(properties: SourcePriority) {
    Object.assign(this, properties);
  }
}

export class VideoMonitoringSetting {
  BlackFrames?: BlackFrames;
  FrozenFrames?: FrozenFrames;
  constructor(properties: VideoMonitoringSetting) {
    Object.assign(this, properties);
  }
}

export class VpcInterface {
  NetworkInterfaceType?: Value<string>;
  NetworkInterfaceIds?: List<Value<string>>;
  SubnetId!: Value<string>;
  SecurityGroupIds!: List<Value<string>>;
  RoleArn!: Value<string>;
  Name!: Value<string>;
  constructor(properties: VpcInterface) {
    Object.assign(this, properties);
  }
}

export class VpcInterfaceAttachment {
  VpcInterfaceName?: Value<string>;
  constructor(properties: VpcInterfaceAttachment) {
    Object.assign(this, properties);
  }
}
export interface FlowProperties {
  SourceMonitoringConfig?: SourceMonitoringConfig;
  SourceFailoverConfig?: FailoverConfig;
  VpcInterfaces?: List<VpcInterface>;
  MediaStreams?: List<MediaStream>;
  NdiConfig?: NdiConfig;
  AvailabilityZone?: Value<string>;
  Maintenance?: Maintenance;
  Source: Source;
  FlowSize?: Value<string>;
  Name: Value<string>;
}
export default class Flow extends ResourceBase<FlowProperties> {
  static AudioMonitoringSetting = AudioMonitoringSetting;
  static BlackFrames = BlackFrames;
  static Encryption = Encryption;
  static FailoverConfig = FailoverConfig;
  static Fmtp = Fmtp;
  static FrozenFrames = FrozenFrames;
  static GatewayBridgeSource = GatewayBridgeSource;
  static InputConfiguration = InputConfiguration;
  static Interface = Interface;
  static Maintenance = Maintenance;
  static MediaStream = MediaStream;
  static MediaStreamAttributes = MediaStreamAttributes;
  static MediaStreamSourceConfiguration = MediaStreamSourceConfiguration;
  static NdiConfig = NdiConfig;
  static NdiDiscoveryServerConfig = NdiDiscoveryServerConfig;
  static SilentAudio = SilentAudio;
  static Source = Source;
  static SourceMonitoringConfig = SourceMonitoringConfig;
  static SourcePriority = SourcePriority;
  static VideoMonitoringSetting = VideoMonitoringSetting;
  static VpcInterface = VpcInterface;
  static VpcInterfaceAttachment = VpcInterfaceAttachment;
  constructor(properties: FlowProperties) {
    super('AWS::MediaConnect::Flow', properties);
  }
}
