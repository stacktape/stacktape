import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class BridgeFlowSource {
  FlowVpcInterfaceAttachment?: VpcInterfaceAttachment;
  FlowArn!: Value<string>;
  constructor(properties: BridgeFlowSource) {
    Object.assign(this, properties);
  }
}

export class BridgeNetworkSource {
  MulticastSourceSettings?: MulticastSourceSettings;
  NetworkName!: Value<string>;
  MulticastIp!: Value<string>;
  Port!: Value<number>;
  Protocol!: Value<string>;
  constructor(properties: BridgeNetworkSource) {
    Object.assign(this, properties);
  }
}

export class MulticastSourceSettings {
  MulticastSourceIp?: Value<string>;
  constructor(properties: MulticastSourceSettings) {
    Object.assign(this, properties);
  }
}

export class VpcInterfaceAttachment {
  VpcInterfaceName?: Value<string>;
  constructor(properties: VpcInterfaceAttachment) {
    Object.assign(this, properties);
  }
}
export interface BridgeSourceProperties {
  NetworkSource?: BridgeNetworkSource;
  BridgeArn: Value<string>;
  FlowSource?: BridgeFlowSource;
  Name: Value<string>;
}
export default class BridgeSource extends ResourceBase<BridgeSourceProperties> {
  static BridgeFlowSource = BridgeFlowSource;
  static BridgeNetworkSource = BridgeNetworkSource;
  static MulticastSourceSettings = MulticastSourceSettings;
  static VpcInterfaceAttachment = VpcInterfaceAttachment;
  constructor(properties: BridgeSourceProperties) {
    super('AWS::MediaConnect::BridgeSource', properties);
  }
}
