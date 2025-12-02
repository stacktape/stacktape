import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class LoRaWANGateway {
  RfRegion!: Value<string>;
  GatewayEui!: Value<string>;
  constructor(properties: LoRaWANGateway) {
    Object.assign(this, properties);
  }
}
export interface WirelessGatewayProperties {
  LastUplinkReceivedAt?: Value<string>;
  Description?: Value<string>;
  LoRaWAN: LoRaWANGateway;
  ThingArn?: Value<string>;
  ThingName?: Value<string>;
  Tags?: List<ResourceTag>;
  Name?: Value<string>;
}
export default class WirelessGateway extends ResourceBase<WirelessGatewayProperties> {
  static LoRaWANGateway = LoRaWANGateway;
  constructor(properties: WirelessGatewayProperties) {
    super('AWS::IoTWireless::WirelessGateway', properties);
  }
}
