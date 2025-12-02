import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class InputDestinationRequest {
  StreamName?: Value<string>;
  Network?: Value<string>;
  NetworkRoutes?: List<InputRequestDestinationRoute>;
  StaticIpAddress?: Value<string>;
  constructor(properties: InputDestinationRequest) {
    Object.assign(this, properties);
  }
}

export class InputDeviceRequest {
  Id?: Value<string>;
  constructor(properties: InputDeviceRequest) {
    Object.assign(this, properties);
  }
}

export class InputDeviceSettings {
  Id?: Value<string>;
  constructor(properties: InputDeviceSettings) {
    Object.assign(this, properties);
  }
}

export class InputRequestDestinationRoute {
  Cidr?: Value<string>;
  Gateway?: Value<string>;
  constructor(properties: InputRequestDestinationRoute) {
    Object.assign(this, properties);
  }
}

export class InputSdpLocation {
  MediaIndex?: Value<number>;
  SdpUrl?: Value<string>;
  constructor(properties: InputSdpLocation) {
    Object.assign(this, properties);
  }
}

export class InputSourceRequest {
  Username?: Value<string>;
  PasswordParam?: Value<string>;
  Url?: Value<string>;
  constructor(properties: InputSourceRequest) {
    Object.assign(this, properties);
  }
}

export class InputVpcRequest {
  SecurityGroupIds?: List<Value<string>>;
  SubnetIds?: List<Value<string>>;
  constructor(properties: InputVpcRequest) {
    Object.assign(this, properties);
  }
}

export class MediaConnectFlowRequest {
  FlowArn?: Value<string>;
  constructor(properties: MediaConnectFlowRequest) {
    Object.assign(this, properties);
  }
}

export class MulticastSettingsCreateRequest {
  Sources?: List<MulticastSourceCreateRequest>;
  constructor(properties: MulticastSettingsCreateRequest) {
    Object.assign(this, properties);
  }
}

export class MulticastSettingsUpdateRequest {
  Sources?: List<MulticastSourceUpdateRequest>;
  constructor(properties: MulticastSettingsUpdateRequest) {
    Object.assign(this, properties);
  }
}

export class MulticastSourceCreateRequest {
  SourceIp?: Value<string>;
  Url?: Value<string>;
  constructor(properties: MulticastSourceCreateRequest) {
    Object.assign(this, properties);
  }
}

export class MulticastSourceUpdateRequest {
  SourceIp?: Value<string>;
  Url?: Value<string>;
  constructor(properties: MulticastSourceUpdateRequest) {
    Object.assign(this, properties);
  }
}

export class Smpte2110ReceiverGroup {
  SdpSettings?: Smpte2110ReceiverGroupSdpSettings;
  constructor(properties: Smpte2110ReceiverGroup) {
    Object.assign(this, properties);
  }
}

export class Smpte2110ReceiverGroupSdpSettings {
  AudioSdps?: List<InputSdpLocation>;
  AncillarySdps?: List<InputSdpLocation>;
  VideoSdp?: InputSdpLocation;
  constructor(properties: Smpte2110ReceiverGroupSdpSettings) {
    Object.assign(this, properties);
  }
}

export class Smpte2110ReceiverGroupSettings {
  Smpte2110ReceiverGroups?: List<Smpte2110ReceiverGroup>;
  constructor(properties: Smpte2110ReceiverGroupSettings) {
    Object.assign(this, properties);
  }
}

export class SrtCallerDecryptionRequest {
  Algorithm?: Value<string>;
  PassphraseSecretArn?: Value<string>;
  constructor(properties: SrtCallerDecryptionRequest) {
    Object.assign(this, properties);
  }
}

export class SrtCallerSourceRequest {
  SrtListenerPort?: Value<string>;
  StreamId?: Value<string>;
  MinimumLatency?: Value<number>;
  SrtListenerAddress?: Value<string>;
  Decryption?: SrtCallerDecryptionRequest;
  constructor(properties: SrtCallerSourceRequest) {
    Object.assign(this, properties);
  }
}

export class SrtSettingsRequest {
  SrtCallerSources?: List<SrtCallerSourceRequest>;
  constructor(properties: SrtSettingsRequest) {
    Object.assign(this, properties);
  }
}
export interface InputProperties {
  SrtSettings?: SrtSettingsRequest;
  InputNetworkLocation?: Value<string>;
  Destinations?: List<InputDestinationRequest>;
  Vpc?: InputVpcRequest;
  MediaConnectFlows?: List<MediaConnectFlowRequest>;
  Sources?: List<InputSourceRequest>;
  RoleArn?: Value<string>;
  Name?: Value<string>;
  Type?: Value<string>;
  Smpte2110ReceiverGroupSettings?: Smpte2110ReceiverGroupSettings;
  SdiSources?: List<Value<string>>;
  InputSecurityGroups?: List<Value<string>>;
  MulticastSettings?: MulticastSettingsCreateRequest;
  InputDevices?: List<InputDeviceSettings>;
  Tags?: { [key: string]: any };
}
export default class Input extends ResourceBase<InputProperties> {
  static InputDestinationRequest = InputDestinationRequest;
  static InputDeviceRequest = InputDeviceRequest;
  static InputDeviceSettings = InputDeviceSettings;
  static InputRequestDestinationRoute = InputRequestDestinationRoute;
  static InputSdpLocation = InputSdpLocation;
  static InputSourceRequest = InputSourceRequest;
  static InputVpcRequest = InputVpcRequest;
  static MediaConnectFlowRequest = MediaConnectFlowRequest;
  static MulticastSettingsCreateRequest = MulticastSettingsCreateRequest;
  static MulticastSettingsUpdateRequest = MulticastSettingsUpdateRequest;
  static MulticastSourceCreateRequest = MulticastSourceCreateRequest;
  static MulticastSourceUpdateRequest = MulticastSourceUpdateRequest;
  static Smpte2110ReceiverGroup = Smpte2110ReceiverGroup;
  static Smpte2110ReceiverGroupSdpSettings = Smpte2110ReceiverGroupSdpSettings;
  static Smpte2110ReceiverGroupSettings = Smpte2110ReceiverGroupSettings;
  static SrtCallerDecryptionRequest = SrtCallerDecryptionRequest;
  static SrtCallerSourceRequest = SrtCallerSourceRequest;
  static SrtSettingsRequest = SrtSettingsRequest;
  constructor(properties?: InputProperties) {
    super('AWS::MediaLive::Input', properties || {});
  }
}
