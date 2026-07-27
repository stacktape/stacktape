import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class GatewayNetwork {
  CidrBlock!: Value<string>;
  Name!: Value<string>;
  constructor(properties: GatewayNetwork) {
    Object.assign(this, properties);
  }
}
export interface GatewayProperties {
  Networks: List<GatewayNetwork>;
  EgressCidrBlocks: List<Value<string>>;
  Name: Value<string>;
}
export default class Gateway extends ResourceBase<GatewayProperties> {
  static GatewayNetwork = GatewayNetwork;
  constructor(properties: GatewayProperties) {
    super('AWS::MediaConnect::Gateway', properties);
  }
}
