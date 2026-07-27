import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class BridgeFlowSource {
  FlowVpcInterfaceAttachment?: VpcInterfaceAttachment;
  FlowArn!: Value<string>;
  Name!: Value<string>;
  constructor(properties: BridgeFlowSource) {
    Object.assign(this, properties);
  }
}

export class BridgeNetworkOutput {
  NetworkName!: Value<string>;
  Port!: Value<number>;
  IpAddress!: Value<string>;
  Protocol!: Value<string>;
  Ttl!: Value<number>;
  Name!: Value<string>;
  constructor(properties: BridgeNetworkOutput) {
    Object.assign(this, properties);
  }
}

export class BridgeNetworkSource {
  MulticastSourceSettings?: MulticastSourceSettings;
  NetworkName!: Value<string>;
  MulticastIp!: Value<string>;
  Port!: Value<number>;
  Protocol!: Value<string>;
  Name!: Value<string>;
  constructor(properties: BridgeNetworkSource) {
    Object.assign(this, properties);
  }
}

export class BridgeOutput {
  NetworkOutput?: BridgeNetworkOutput;
  constructor(properties: BridgeOutput) {
    Object.assign(this, properties);
  }
}

export class BridgeSource {
  NetworkSource?: BridgeNetworkSource;
  FlowSource?: BridgeFlowSource;
  constructor(properties: BridgeSource) {
    Object.assign(this, properties);
  }
}

export class EgressGatewayBridge {
  MaxBitrate!: Value<number>;
  constructor(properties: EgressGatewayBridge) {
    Object.assign(this, properties);
  }
}

export class FailoverConfig {
  State?: Value<string>;
  SourcePriority?: SourcePriority;
  FailoverMode!: Value<string>;
  constructor(properties: FailoverConfig) {
    Object.assign(this, properties);
  }
}

export class IngressGatewayBridge {
  MaxOutputs!: Value<number>;
  MaxBitrate!: Value<number>;
  constructor(properties: IngressGatewayBridge) {
    Object.assign(this, properties);
  }
}

export class MulticastSourceSettings {
  MulticastSourceIp?: Value<string>;
  constructor(properties: MulticastSourceSettings) {
    Object.assign(this, properties);
  }
}

export class SourcePriority {
  PrimarySource?: Value<string>;
  constructor(properties: SourcePriority) {
    Object.assign(this, properties);
  }
}

export class VpcInterfaceAttachment {
  VpcInterfaceName?: Value<string>;
  constructor(properties: VpcInterfaceAttachment) {
    Object.assign(this, properties);
  }
}
export interface BridgeProperties {
  SourceFailoverConfig?: FailoverConfig;
  IngressGatewayBridge?: IngressGatewayBridge;
  EgressGatewayBridge?: EgressGatewayBridge;
  Outputs?: List<BridgeOutput>;
  PlacementArn: Value<string>;
  Sources: List<BridgeSource>;
  Name: Value<string>;
}
export default class Bridge extends ResourceBase<BridgeProperties> {
  static BridgeFlowSource = BridgeFlowSource;
  static BridgeNetworkOutput = BridgeNetworkOutput;
  static BridgeNetworkSource = BridgeNetworkSource;
  static BridgeOutput = BridgeOutput;
  static BridgeSource = BridgeSource;
  static EgressGatewayBridge = EgressGatewayBridge;
  static FailoverConfig = FailoverConfig;
  static IngressGatewayBridge = IngressGatewayBridge;
  static MulticastSourceSettings = MulticastSourceSettings;
  static SourcePriority = SourcePriority;
  static VpcInterfaceAttachment = VpcInterfaceAttachment;
  constructor(properties: BridgeProperties) {
    super('AWS::MediaConnect::Bridge', properties);
  }
}
