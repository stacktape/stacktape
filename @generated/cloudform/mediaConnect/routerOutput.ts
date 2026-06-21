import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
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

export class MediaConnectFlowRouterOutputConfiguration {
  FlowSourceArn?: Value<string>;
  FlowArn?: Value<string>;
  DestinationTransitEncryption!: FlowTransitEncryption;
  constructor(properties: MediaConnectFlowRouterOutputConfiguration) {
    Object.assign(this, properties);
  }
}

export class MediaLiveInputRouterOutputConfiguration {
  MediaLiveInputArn?: Value<string>;
  MediaLivePipelineId?: Value<string>;
  DestinationTransitEncryption!: MediaLiveTransitEncryption;
  constructor(properties: MediaLiveInputRouterOutputConfiguration) {
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

export class PreferredDayTimeMaintenanceConfiguration {
  Time!: Value<string>;
  Day!: Value<string>;
  constructor(properties: PreferredDayTimeMaintenanceConfiguration) {
    Object.assign(this, properties);
  }
}

export class RistRouterOutputConfiguration {
  DestinationPort!: Value<number>;
  DestinationAddress!: Value<string>;
  constructor(properties: RistRouterOutputConfiguration) {
    Object.assign(this, properties);
  }
}

export class RouterOutputConfiguration {
  MediaLiveInput?: MediaLiveInputRouterOutputConfiguration;
  MediaConnectFlow?: MediaConnectFlowRouterOutputConfiguration;
  Standard?: StandardRouterOutputConfiguration;
  constructor(properties: RouterOutputConfiguration) {
    Object.assign(this, properties);
  }
}

export class RouterOutputProtocolConfiguration {
  SrtCaller?: SrtCallerRouterOutputConfiguration;
  SrtListener?: SrtListenerRouterOutputConfiguration;
  Rist?: RistRouterOutputConfiguration;
  Rtp?: RtpRouterOutputConfiguration;
  constructor(properties: RouterOutputProtocolConfiguration) {
    Object.assign(this, properties);
  }
}

export class RtpRouterOutputConfiguration {
  ForwardErrorCorrection?: Value<string>;
  DestinationPort!: Value<number>;
  DestinationAddress!: Value<string>;
  constructor(properties: RtpRouterOutputConfiguration) {
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

export class SrtCallerRouterOutputConfiguration {
  StreamId?: Value<string>;
  EncryptionConfiguration?: SrtEncryptionConfiguration;
  DestinationPort!: Value<number>;
  MinimumLatencyMilliseconds!: Value<number>;
  DestinationAddress!: Value<string>;
  constructor(properties: SrtCallerRouterOutputConfiguration) {
    Object.assign(this, properties);
  }
}

export class SrtEncryptionConfiguration {
  EncryptionKey!: SecretsManagerEncryptionKeyConfiguration;
  constructor(properties: SrtEncryptionConfiguration) {
    Object.assign(this, properties);
  }
}

export class SrtListenerRouterOutputConfiguration {
  EncryptionConfiguration?: SrtEncryptionConfiguration;
  Port!: Value<number>;
  MinimumLatencyMilliseconds!: Value<number>;
  constructor(properties: SrtListenerRouterOutputConfiguration) {
    Object.assign(this, properties);
  }
}

export class StandardRouterOutputConfiguration {
  ProtocolConfiguration!: RouterOutputProtocolConfiguration;
  NetworkInterfaceArn!: Value<string>;
  Protocol?: Value<string>;
  constructor(properties: StandardRouterOutputConfiguration) {
    Object.assign(this, properties);
  }
}
export interface RouterOutputProperties {
  RoutingScope: Value<string>;
  Configuration: RouterOutputConfiguration;
  Tier: Value<string>;
  RegionName?: Value<string>;
  MaximumBitrate: Value<number>;
  AvailabilityZone?: Value<string>;
  MaintenanceConfiguration?: MaintenanceConfiguration;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
}
export default class RouterOutput extends ResourceBase<RouterOutputProperties> {
  static FlowTransitEncryption = FlowTransitEncryption;
  static FlowTransitEncryptionKeyConfiguration = FlowTransitEncryptionKeyConfiguration;
  static MaintenanceConfiguration = MaintenanceConfiguration;
  static MediaConnectFlowRouterOutputConfiguration = MediaConnectFlowRouterOutputConfiguration;
  static MediaLiveInputRouterOutputConfiguration = MediaLiveInputRouterOutputConfiguration;
  static MediaLiveTransitEncryption = MediaLiveTransitEncryption;
  static MediaLiveTransitEncryptionKeyConfiguration = MediaLiveTransitEncryptionKeyConfiguration;
  static PreferredDayTimeMaintenanceConfiguration = PreferredDayTimeMaintenanceConfiguration;
  static RistRouterOutputConfiguration = RistRouterOutputConfiguration;
  static RouterOutputConfiguration = RouterOutputConfiguration;
  static RouterOutputProtocolConfiguration = RouterOutputProtocolConfiguration;
  static RtpRouterOutputConfiguration = RtpRouterOutputConfiguration;
  static SecretsManagerEncryptionKeyConfiguration = SecretsManagerEncryptionKeyConfiguration;
  static SrtCallerRouterOutputConfiguration = SrtCallerRouterOutputConfiguration;
  static SrtEncryptionConfiguration = SrtEncryptionConfiguration;
  static SrtListenerRouterOutputConfiguration = SrtListenerRouterOutputConfiguration;
  static StandardRouterOutputConfiguration = StandardRouterOutputConfiguration;
  constructor(properties: RouterOutputProperties) {
    super('AWS::MediaConnect::RouterOutput', properties);
  }
}
