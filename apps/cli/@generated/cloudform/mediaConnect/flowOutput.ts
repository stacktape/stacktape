import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class DestinationConfiguration {
  DestinationIp!: Value<string>;
  DestinationPort!: Value<number>;
  Interface!: Interface;
  constructor(properties: DestinationConfiguration) {
    Object.assign(this, properties);
  }
}

export class EncodingParameters {
  EncoderProfile?: Value<string>;
  CompressionFactor!: Value<number>;
  constructor(properties: EncodingParameters) {
    Object.assign(this, properties);
  }
}

export class Encryption {
  SecretArn!: Value<string>;
  KeyType?: Value<string>;
  Algorithm?: Value<string>;
  RoleArn!: Value<string>;
  constructor(properties: Encryption) {
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

export class Interface {
  Name!: Value<string>;
  constructor(properties: Interface) {
    Object.assign(this, properties);
  }
}

export class MediaStreamOutputConfiguration {
  EncodingParameters?: EncodingParameters;
  MediaStreamName!: Value<string>;
  EncodingName!: Value<string>;
  DestinationConfigurations?: List<DestinationConfiguration>;
  constructor(properties: MediaStreamOutputConfiguration) {
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

export class VpcInterfaceAttachment {
  VpcInterfaceName?: Value<string>;
  constructor(properties: VpcInterfaceAttachment) {
    Object.assign(this, properties);
  }
}
export interface FlowOutputProperties {
  Destination?: Value<string>;
  SmoothingLatency?: Value<number>;
  StreamId?: Value<string>;
  Description?: Value<string>;
  NdiSpeedHqQuality?: Value<number>;
  Port?: Value<number>;
  RemoteId?: Value<string>;
  MediaStreamOutputConfigurations?: List<MediaStreamOutputConfiguration>;
  Encryption?: Encryption;
  RouterIntegrationState?: Value<string>;
  OutputStatus?: Value<string>;
  Name?: Value<string>;
  VpcInterfaceAttachment?: VpcInterfaceAttachment;
  MinLatency?: Value<number>;
  RouterIntegrationTransitEncryption?: FlowTransitEncryption;
  Protocol?: Value<string>;
  FlowArn: Value<string>;
  NdiProgramName?: Value<string>;
  MaxLatency?: Value<number>;
  Tags?: List<ResourceTag>;
  CidrAllowList?: List<Value<string>>;
}
export default class FlowOutput extends ResourceBase<FlowOutputProperties> {
  static DestinationConfiguration = DestinationConfiguration;
  static EncodingParameters = EncodingParameters;
  static Encryption = Encryption;
  static FlowTransitEncryption = FlowTransitEncryption;
  static FlowTransitEncryptionKeyConfiguration = FlowTransitEncryptionKeyConfiguration;
  static Interface = Interface;
  static MediaStreamOutputConfiguration = MediaStreamOutputConfiguration;
  static SecretsManagerEncryptionKeyConfiguration = SecretsManagerEncryptionKeyConfiguration;
  static VpcInterfaceAttachment = VpcInterfaceAttachment;
  constructor(properties: FlowOutputProperties) {
    super('AWS::MediaConnect::FlowOutput', properties);
  }
}
