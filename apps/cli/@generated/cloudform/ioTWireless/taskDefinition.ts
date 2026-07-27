import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class LoRaWANGatewayVersion {
  Station?: Value<string>;
  Model?: Value<string>;
  PackageVersion?: Value<string>;
  constructor(properties: LoRaWANGatewayVersion) {
    Object.assign(this, properties);
  }
}

export class LoRaWANUpdateGatewayTaskCreate {
  UpdateSignature?: Value<string>;
  SigKeyCrc?: Value<number>;
  UpdateVersion?: LoRaWANGatewayVersion;
  CurrentVersion?: LoRaWANGatewayVersion;
  constructor(properties: LoRaWANUpdateGatewayTaskCreate) {
    Object.assign(this, properties);
  }
}

export class LoRaWANUpdateGatewayTaskEntry {
  UpdateVersion?: LoRaWANGatewayVersion;
  CurrentVersion?: LoRaWANGatewayVersion;
  constructor(properties: LoRaWANUpdateGatewayTaskEntry) {
    Object.assign(this, properties);
  }
}

export class UpdateWirelessGatewayTaskCreate {
  LoRaWAN?: LoRaWANUpdateGatewayTaskCreate;
  UpdateDataSource?: Value<string>;
  UpdateDataRole?: Value<string>;
  constructor(properties: UpdateWirelessGatewayTaskCreate) {
    Object.assign(this, properties);
  }
}
export interface TaskDefinitionProperties {
  AutoCreateTasks: Value<boolean>;
  LoRaWANUpdateGatewayTaskEntry?: LoRaWANUpdateGatewayTaskEntry;
  Update?: UpdateWirelessGatewayTaskCreate;
  TaskDefinitionType?: Value<string>;
  Tags?: List<ResourceTag>;
  Name?: Value<string>;
}
export default class TaskDefinition extends ResourceBase<TaskDefinitionProperties> {
  static LoRaWANGatewayVersion = LoRaWANGatewayVersion;
  static LoRaWANUpdateGatewayTaskCreate = LoRaWANUpdateGatewayTaskCreate;
  static LoRaWANUpdateGatewayTaskEntry = LoRaWANUpdateGatewayTaskEntry;
  static UpdateWirelessGatewayTaskCreate = UpdateWirelessGatewayTaskCreate;
  constructor(properties: TaskDefinitionProperties) {
    super('AWS::IoTWireless::TaskDefinition', properties);
  }
}
