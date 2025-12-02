import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class CapacityAssignment {
  WorkgroupNames!: List<Value<string>>;
  constructor(properties: CapacityAssignment) {
    Object.assign(this, properties);
  }
}

export class CapacityAssignmentConfiguration {
  CapacityAssignments!: List<CapacityAssignment>;
  constructor(properties: CapacityAssignmentConfiguration) {
    Object.assign(this, properties);
  }
}
export interface CapacityReservationProperties {
  TargetDpus: Value<number>;
  CapacityAssignmentConfiguration?: CapacityAssignmentConfiguration;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
}
export default class CapacityReservation extends ResourceBase<CapacityReservationProperties> {
  static CapacityAssignment = CapacityAssignment;
  static CapacityAssignmentConfiguration = CapacityAssignmentConfiguration;
  constructor(properties: CapacityReservationProperties) {
    super('AWS::Athena::CapacityReservation', properties);
  }
}
