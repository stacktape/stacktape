import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class DeviceInner {
  IotThingName?: Value<string>;
  Description?: Value<string>;
  DeviceName!: Value<string>;
  constructor(properties: DeviceInner) {
    Object.assign(this, properties);
  }
}
export interface DeviceProperties {
  DeviceFleetName: Value<string>;
  Device?: Device;
  Tags?: List<ResourceTag>;
}
export default class Device extends ResourceBase<DeviceProperties> {
  static Device = DeviceInner;
  constructor(properties: DeviceProperties) {
    super('AWS::SageMaker::Device', properties);
  }
}
