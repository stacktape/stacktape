import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class GatewayCapabilitySummary {
  CapabilityNamespace!: Value<string>;
  CapabilityConfiguration?: Value<string>;
  constructor(properties: GatewayCapabilitySummary) {
    Object.assign(this, properties);
  }
}

export class GatewayPlatform {
  GreengrassV2?: GreengrassV2;
  SiemensIE?: SiemensIE;
  constructor(properties: GatewayPlatform) {
    Object.assign(this, properties);
  }
}

export class GreengrassV2 {
  CoreDeviceThingName!: Value<string>;
  CoreDeviceOperatingSystem?: Value<string>;
  constructor(properties: GreengrassV2) {
    Object.assign(this, properties);
  }
}

export class SiemensIE {
  IotCoreThingName!: Value<string>;
  constructor(properties: SiemensIE) {
    Object.assign(this, properties);
  }
}
export interface GatewayProperties {
  GatewayCapabilitySummaries?: List<GatewayCapabilitySummary>;
  GatewayName: Value<string>;
  GatewayPlatform: GatewayPlatform;
  GatewayVersion?: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class Gateway extends ResourceBase<GatewayProperties> {
  static GatewayCapabilitySummary = GatewayCapabilitySummary;
  static GatewayPlatform = GatewayPlatform;
  static GreengrassV2 = GreengrassV2;
  static SiemensIE = SiemensIE;
  constructor(properties: GatewayProperties) {
    super('AWS::IoTSiteWise::Gateway', properties);
  }
}
