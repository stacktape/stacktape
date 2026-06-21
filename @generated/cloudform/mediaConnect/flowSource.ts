import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class Encryption {
  SecretArn?: Value<string>;
  KeyType?: Value<string>;
  Algorithm?: Value<string>;
  RoleArn!: Value<string>;
  constructor(properties: Encryption) {
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

export class VpcInterfaceAttachment {
  VpcInterfaceName?: Value<string>;
  constructor(properties: VpcInterfaceAttachment) {
    Object.assign(this, properties);
  }
}
export interface FlowSourceProperties {
  StreamId?: Value<string>;
  Description: Value<string>;
  IngestPort?: Value<number>;
  Decryption?: Encryption;
  GatewayBridgeSource?: GatewayBridgeSource;
  SourceListenerAddress?: Value<string>;
  SourceListenerPort?: Value<number>;
  Name: Value<string>;
  WhitelistCidr?: Value<string>;
  MinLatency?: Value<number>;
  VpcInterfaceName?: Value<string>;
  MaxBitrate?: Value<number>;
  Protocol?: Value<string>;
  FlowArn: Value<string>;
  MaxLatency?: Value<number>;
  Tags?: List<ResourceTag>;
}
export default class FlowSource extends ResourceBase<FlowSourceProperties> {
  static Encryption = Encryption;
  static GatewayBridgeSource = GatewayBridgeSource;
  static VpcInterfaceAttachment = VpcInterfaceAttachment;
  constructor(properties: FlowSourceProperties) {
    super('AWS::MediaConnect::FlowSource', properties);
  }
}
