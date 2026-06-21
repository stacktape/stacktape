import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class FailoverRouterInputConfiguration {
  NetworkInterfaceArn!: Value<string>;
  SourcePriorityMode!: Value<string>;
  ProtocolConfigurations!: List<FailoverRouterInputProtocolConfiguration>;
  PrimarySourceIndex?: Value<number>;
  constructor(properties: FailoverRouterInputConfiguration) {
    Object.assign(this, properties);
  }
}

export class FailoverRouterInputProtocolConfiguration {
  SrtCaller?: SrtCallerRouterInputConfiguration;
  SrtListener?: SrtListenerRouterInputConfiguration;
  Rist?: RistRouterInputConfiguration;
  Rtp?: RtpRouterInputConfiguration;
  constructor(properties: FailoverRouterInputProtocolConfiguration) {
    Object.assign(this, properties);
  }
}

export class FlowTransitEncryption {
  EncryptionKeyType?: Value<string>;
  EncryptionKeyConfiguration!: FlowTransitEncryptionKeyConfiguration;
  constructor(properties: FlowTransitEncryption) {
    Object.assign(this, properties);
  }
}

export class FlowTransitEncryptionKeyConfiguration {
  SecretsManager?: SecretsManagerEncryptionKeyConfiguration;
  Automatic?: { [key: string]: any };
  constructor(properties: FlowTransitEncryptionKeyConfiguration) {
    Object.assign(this, properties);
  }
}

export class MaintenanceConfiguration {
  Default?: { [key: string]: any };
  PreferredDayTime?: PreferredDayTimeMaintenanceConfiguration;
  constructor(properties: MaintenanceConfiguration) {
    Object.assign(this, properties);
  }
}

export class MediaConnectFlowRouterInputConfiguration {
  FlowOutputArn?: Value<string>;
  SourceTransitDecryption!: FlowTransitEncryption;
  FlowArn?: Value<string>;
  constructor(properties: MediaConnectFlowRouterInputConfiguration) {
    Object.assign(this, properties);
  }
}

export class MediaLiveChannelRouterInputConfiguration {
  MediaLiveChannelArn?: Value<string>;
  MediaLivePipelineId?: Value<string>;
  MediaLiveChannelOutputName?: Value<string>;
  SourceTransitDecryption!: MediaLiveTransitEncryption;
  constructor(properties: MediaLiveChannelRouterInputConfiguration) {
    Object.assign(this, properties);
  }
}

export class MediaLiveTransitEncryption {
  EncryptionKeyType?: Value<string>;
  EncryptionKeyConfiguration!: MediaLiveTransitEncryptionKeyConfiguration;
  constructor(properties: MediaLiveTransitEncryption) {
    Object.assign(this, properties);
  }
}

export class MediaLiveTransitEncryptionKeyConfiguration {
  SecretsManager?: SecretsManagerEncryptionKeyConfiguration;
  Automatic?: { [key: string]: any };
  constructor(properties: MediaLiveTransitEncryptionKeyConfiguration) {
    Object.assign(this, properties);
  }
}

export class MergeRouterInputConfiguration {
  MergeRecoveryWindowMilliseconds!: Value<number>;
  NetworkInterfaceArn!: Value<string>;
  ProtocolConfigurations!: List<MergeRouterInputProtocolConfiguration>;
  constructor(properties: MergeRouterInputConfiguration) {
    Object.assign(this, properties);
  }
}

export class MergeRouterInputProtocolConfiguration {
  Rist?: RistRouterInputConfiguration;
  Rtp?: RtpRouterInputConfiguration;
  constructor(properties: MergeRouterInputProtocolConfiguration) {
    Object.assign(this, properties);
  }
}

export class PreferredDayTimeMaintenanceConfiguration {
  Time!: Value<string>;
  Day!: Value<string>;
  constructor(properties: PreferredDayTimeMaintenanceConfiguration) {
    Object.assign(this, properties);
  }
}

export class RistRouterInputConfiguration {
  RecoveryLatencyMilliseconds!: Value<number>;
  Port!: Value<number>;
  constructor(properties: RistRouterInputConfiguration) {
    Object.assign(this, properties);
  }
}

export class RouterInputConfiguration {
  MediaConnectFlow?: MediaConnectFlowRouterInputConfiguration;
  Failover?: FailoverRouterInputConfiguration;
  Merge?: MergeRouterInputConfiguration;
  MediaLiveChannel?: MediaLiveChannelRouterInputConfiguration;
  Standard?: StandardRouterInputConfiguration;
  constructor(properties: RouterInputConfiguration) {
    Object.assign(this, properties);
  }
}

export class RouterInputProtocolConfiguration {
  SrtCaller?: SrtCallerRouterInputConfiguration;
  SrtListener?: SrtListenerRouterInputConfiguration;
  Rist?: RistRouterInputConfiguration;
  Rtp?: RtpRouterInputConfiguration;
  constructor(properties: RouterInputProtocolConfiguration) {
    Object.assign(this, properties);
  }
}

export class RouterInputTransitEncryption {
  EncryptionKeyType?: Value<string>;
  EncryptionKeyConfiguration!: RouterInputTransitEncryptionKeyConfiguration;
  constructor(properties: RouterInputTransitEncryption) {
    Object.assign(this, properties);
  }
}

export class RouterInputTransitEncryptionKeyConfiguration {
  SecretsManager?: SecretsManagerEncryptionKeyConfiguration;
  Automatic?: { [key: string]: any };
  constructor(properties: RouterInputTransitEncryptionKeyConfiguration) {
    Object.assign(this, properties);
  }
}

export class RtpRouterInputConfiguration {
  ForwardErrorCorrection?: Value<string>;
  Port!: Value<number>;
  constructor(properties: RtpRouterInputConfiguration) {
    Object.assign(this, properties);
  }
}

export class SecretsManagerEncryptionKeyConfiguration {
  SecretArn!: Value<string>;
  RoleArn!: Value<string>;
  constructor(properties: SecretsManagerEncryptionKeyConfiguration) {
    Object.assign(this, properties);
  }
}

export class SrtCallerRouterInputConfiguration {
  SourceAddress!: Value<string>;
  StreamId?: Value<string>;
  DecryptionConfiguration?: SrtDecryptionConfiguration;
  SourcePort!: Value<number>;
  MinimumLatencyMilliseconds!: Value<number>;
  constructor(properties: SrtCallerRouterInputConfiguration) {
    Object.assign(this, properties);
  }
}

export class SrtDecryptionConfiguration {
  EncryptionKey!: SecretsManagerEncryptionKeyConfiguration;
  constructor(properties: SrtDecryptionConfiguration) {
    Object.assign(this, properties);
  }
}

export class SrtListenerRouterInputConfiguration {
  DecryptionConfiguration?: SrtDecryptionConfiguration;
  MinimumLatencyMilliseconds!: Value<number>;
  Port!: Value<number>;
  constructor(properties: SrtListenerRouterInputConfiguration) {
    Object.assign(this, properties);
  }
}

export class StandardRouterInputConfiguration {
  ProtocolConfiguration!: RouterInputProtocolConfiguration;
  NetworkInterfaceArn!: Value<string>;
  Protocol?: Value<string>;
  constructor(properties: StandardRouterInputConfiguration) {
    Object.assign(this, properties);
  }
}
export interface RouterInputProperties {
  RoutingScope: Value<string>;
  TransitEncryption?: RouterInputTransitEncryption;
  Configuration: RouterInputConfiguration;
  Tier: Value<string>;
  RegionName?: Value<string>;
  MaximumBitrate: Value<number>;
  AvailabilityZone?: Value<string>;
  MaintenanceConfiguration?: MaintenanceConfiguration;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
}
export default class RouterInput extends ResourceBase<RouterInputProperties> {
  static FailoverRouterInputConfiguration = FailoverRouterInputConfiguration;
  static FailoverRouterInputProtocolConfiguration = FailoverRouterInputProtocolConfiguration;
  static FlowTransitEncryption = FlowTransitEncryption;
  static FlowTransitEncryptionKeyConfiguration = FlowTransitEncryptionKeyConfiguration;
  static MaintenanceConfiguration = MaintenanceConfiguration;
  static MediaConnectFlowRouterInputConfiguration = MediaConnectFlowRouterInputConfiguration;
  static MediaLiveChannelRouterInputConfiguration = MediaLiveChannelRouterInputConfiguration;
  static MediaLiveTransitEncryption = MediaLiveTransitEncryption;
  static MediaLiveTransitEncryptionKeyConfiguration = MediaLiveTransitEncryptionKeyConfiguration;
  static MergeRouterInputConfiguration = MergeRouterInputConfiguration;
  static MergeRouterInputProtocolConfiguration = MergeRouterInputProtocolConfiguration;
  static PreferredDayTimeMaintenanceConfiguration = PreferredDayTimeMaintenanceConfiguration;
  static RistRouterInputConfiguration = RistRouterInputConfiguration;
  static RouterInputConfiguration = RouterInputConfiguration;
  static RouterInputProtocolConfiguration = RouterInputProtocolConfiguration;
  static RouterInputTransitEncryption = RouterInputTransitEncryption;
  static RouterInputTransitEncryptionKeyConfiguration = RouterInputTransitEncryptionKeyConfiguration;
  static RtpRouterInputConfiguration = RtpRouterInputConfiguration;
  static SecretsManagerEncryptionKeyConfiguration = SecretsManagerEncryptionKeyConfiguration;
  static SrtCallerRouterInputConfiguration = SrtCallerRouterInputConfiguration;
  static SrtDecryptionConfiguration = SrtDecryptionConfiguration;
  static SrtListenerRouterInputConfiguration = SrtListenerRouterInputConfiguration;
  static StandardRouterInputConfiguration = StandardRouterInputConfiguration;
  constructor(properties: RouterInputProperties) {
    super('AWS::MediaConnect::RouterInput', properties);
  }
}
