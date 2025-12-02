import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class CapabilityReport {
  Endpoints!: List<CapabilityReportEndpoint>;
  Version!: Value<string>;
  NodeId?: Value<string>;
  constructor(properties: CapabilityReport) {
    Object.assign(this, properties);
  }
}

export class CapabilityReportCapability {
  Version!: Value<string>;
  Actions!: List<Value<string>>;
  Events!: List<Value<string>>;
  Id!: Value<string>;
  Properties!: List<Value<string>>;
  Name!: Value<string>;
  constructor(properties: CapabilityReportCapability) {
    Object.assign(this, properties);
  }
}

export class CapabilityReportEndpoint {
  Capabilities!: List<CapabilityReportCapability>;
  DeviceTypes!: List<Value<string>>;
  Id!: Value<string>;
  constructor(properties: CapabilityReportEndpoint) {
    Object.assign(this, properties);
  }
}
export interface ManagedThingProperties {
  Owner?: Value<string>;
  CapabilityReport?: CapabilityReport;
  AuthenticationMaterialType?: Value<string>;
  Name?: Value<string>;
  AuthenticationMaterial?: Value<string>;
  Brand?: Value<string>;
  Role: Value<string>;
  SerialNumber?: Value<string>;
  MetaData?: { [key: string]: Value<string> };
  Classification?: Value<string>;
  Model?: Value<string>;
  CredentialLockerId?: Value<string>;
  Tags?: { [key: string]: Value<string> };
}
export default class ManagedThing extends ResourceBase<ManagedThingProperties> {
  static CapabilityReport = CapabilityReport;
  static CapabilityReportCapability = CapabilityReportCapability;
  static CapabilityReportEndpoint = CapabilityReportEndpoint;
  constructor(properties: ManagedThingProperties) {
    super('AWS::IoTManagedIntegrations::ManagedThing', properties);
  }
}
