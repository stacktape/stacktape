import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AbpV10x {
  SessionKeys!: SessionKeysAbpV10x;
  DevAddr!: Value<string>;
  constructor(properties: AbpV10x) {
    Object.assign(this, properties);
  }
}

export class AbpV11 {
  SessionKeys!: SessionKeysAbpV11;
  DevAddr!: Value<string>;
  constructor(properties: AbpV11) {
    Object.assign(this, properties);
  }
}

export class Application {
  Type?: Value<string>;
  FPort?: Value<number>;
  DestinationName?: Value<string>;
  constructor(properties: Application) {
    Object.assign(this, properties);
  }
}

export class FPorts {
  Applications?: List<Application>;
  constructor(properties: FPorts) {
    Object.assign(this, properties);
  }
}

export class LoRaWANDevice {
  AbpV10x?: AbpV10x;
  FPorts?: FPorts;
  OtaaV11?: OtaaV11;
  AbpV11?: AbpV11;
  DeviceProfileId?: Value<string>;
  DevEui?: Value<string>;
  OtaaV10x?: OtaaV10x;
  ServiceProfileId?: Value<string>;
  constructor(properties: LoRaWANDevice) {
    Object.assign(this, properties);
  }
}

export class OtaaV10x {
  AppEui!: Value<string>;
  AppKey!: Value<string>;
  constructor(properties: OtaaV10x) {
    Object.assign(this, properties);
  }
}

export class OtaaV11 {
  NwkKey!: Value<string>;
  AppKey!: Value<string>;
  JoinEui!: Value<string>;
  constructor(properties: OtaaV11) {
    Object.assign(this, properties);
  }
}

export class SessionKeysAbpV10x {
  AppSKey!: Value<string>;
  NwkSKey!: Value<string>;
  constructor(properties: SessionKeysAbpV10x) {
    Object.assign(this, properties);
  }
}

export class SessionKeysAbpV11 {
  FNwkSIntKey!: Value<string>;
  AppSKey!: Value<string>;
  SNwkSIntKey!: Value<string>;
  NwkSEncKey!: Value<string>;
  constructor(properties: SessionKeysAbpV11) {
    Object.assign(this, properties);
  }
}
export interface WirelessDeviceProperties {
  LastUplinkReceivedAt?: Value<string>;
  Positioning?: Value<string>;
  Type: Value<string>;
  Description?: Value<string>;
  LoRaWAN?: LoRaWANDevice;
  DestinationName: Value<string>;
  ThingArn?: Value<string>;
  Tags?: List<ResourceTag>;
  Name?: Value<string>;
}
export default class WirelessDevice extends ResourceBase<WirelessDeviceProperties> {
  static AbpV10x = AbpV10x;
  static AbpV11 = AbpV11;
  static Application = Application;
  static FPorts = FPorts;
  static LoRaWANDevice = LoRaWANDevice;
  static OtaaV10x = OtaaV10x;
  static OtaaV11 = OtaaV11;
  static SessionKeysAbpV10x = SessionKeysAbpV10x;
  static SessionKeysAbpV11 = SessionKeysAbpV11;
  constructor(properties: WirelessDeviceProperties) {
    super('AWS::IoTWireless::WirelessDevice', properties);
  }
}
