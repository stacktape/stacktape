import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class CapacityAllocation {
  AllocationType?: Value<string>;
  Count?: Value<number>;
  constructor(properties: CapacityAllocation) {
    Object.assign(this, properties);
  }
}

export class CommitmentInfo {
  CommittedInstanceCount?: Value<number>;
  CommitmentEndDate?: Value<string>;
  constructor(properties: CommitmentInfo) {
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
export interface CapacityReservationProperties {
  Tenancy?: Value<string>;
  EndDateType?: Value<string>;
  TagSpecifications?: List<TagSpecification>;
  UnusedReservationBillingOwnerId?: Value<string>;
  AvailabilityZoneId?: Value<string>;
  AvailabilityZone?: Value<string>;
  EndDate?: Value<string>;
  EbsOptimized?: Value<boolean>;
  OutPostArn?: Value<string>;
  InstanceCount: Value<number>;
  PlacementGroupArn?: Value<string>;
  InstancePlatform: Value<string>;
  InstanceType: Value<string>;
  EphemeralStorage?: Value<boolean>;
  InstanceMatchCriteria?: Value<string>;
}
export default class CapacityReservation extends ResourceBase<CapacityReservationProperties> {
  static CapacityAllocation = CapacityAllocation;
  static CommitmentInfo = CommitmentInfo;
  static TagSpecification = TagSpecification;
  constructor(properties: CapacityReservationProperties) {
    super('AWS::EC2::CapacityReservation', properties);
  }
}
