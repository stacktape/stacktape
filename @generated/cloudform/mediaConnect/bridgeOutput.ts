import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class BridgeNetworkOutput {
  NetworkName!: Value<string>;
  Port!: Value<number>;
  IpAddress!: Value<string>;
  Protocol!: Value<string>;
  Ttl!: Value<number>;
  constructor(properties: BridgeNetworkOutput) {
    Object.assign(this, properties);
  }
}
export interface BridgeOutputProperties {
  BridgeArn: Value<string>;
  NetworkOutput: BridgeNetworkOutput;
  Name: Value<string>;
}
export default class BridgeOutput extends ResourceBase<BridgeOutputProperties> {
  static BridgeNetworkOutput = BridgeNetworkOutput;
  constructor(properties: BridgeOutputProperties) {
    super('AWS::MediaConnect::BridgeOutput', properties);
  }
}
