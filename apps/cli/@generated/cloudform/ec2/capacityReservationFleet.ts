import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class InstanceTypeSpecification {
  Priority?: Value<number>;
  AvailabilityZoneId?: Value<string>;
  AvailabilityZone?: Value<string>;
  InstancePlatform?: Value<string>;
  InstanceType?: Value<string>;
  Weight?: Value<number>;
  EbsOptimized?: Value<boolean>;
  constructor(properties: InstanceTypeSpecification) {
    Object.assign(this, properties);
  }
}

export class TagSpecification {
  ResourceType?: Value<string>;
  Tags?: List<ResourceTag>;
  constructor(properties: TagSpecification) {
    Object.assign(this, properties);
  }
}
export interface CapacityReservationFleetProperties {
  Tenancy?: Value<string>;
  TotalTargetCapacity?: Value<number>;
  AllocationStrategy?: Value<string>;
  TagSpecifications?: List<TagSpecification>;
  NoRemoveEndDate?: Value<boolean>;
  InstanceTypeSpecifications?: List<InstanceTypeSpecification>;
  RemoveEndDate?: Value<boolean>;
  InstanceMatchCriteria?: Value<string>;
  EndDate?: Value<string>;
}
export default class CapacityReservationFleet extends ResourceBase<CapacityReservationFleetProperties> {
  static InstanceTypeSpecification = InstanceTypeSpecification;
  static TagSpecification = TagSpecification;
  constructor(properties?: CapacityReservationFleetProperties) {
    super('AWS::EC2::CapacityReservationFleet', properties || {});
  }
}
