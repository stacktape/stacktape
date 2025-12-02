import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class CapacityLimit {
  CapacityUnit?: Value<string>;
  MaxCapacity?: Value<number>;
  constructor(properties: CapacityLimit) {
    Object.assign(this, properties);
  }
}
export interface ServiceEnvironmentProperties {
  ServiceEnvironmentName?: Value<string>;
  State?: Value<string>;
  ServiceEnvironmentType: Value<string>;
  CapacityLimits: List<CapacityLimit>;
  Tags?: { [key: string]: Value<string> };
}
export default class ServiceEnvironment extends ResourceBase<ServiceEnvironmentProperties> {
  static CapacityLimit = CapacityLimit;
  constructor(properties: ServiceEnvironmentProperties) {
    super('AWS::Batch::ServiceEnvironment', properties);
  }
}
