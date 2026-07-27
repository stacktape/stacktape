import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class CustomerContact {
  Email?: Value<string>;
  constructor(properties: CustomerContact) {
    Object.assign(this, properties);
  }
}

export class MaintenanceWindow {
  CustomActionTimeoutInMins?: Value<number>;
  DaysOfWeek?: List<Value<string>>;
  Preference?: Value<string>;
  LeadTimeInWeeks?: Value<number>;
  Months?: List<Value<string>>;
  PatchingMode?: Value<string>;
  WeeksOfMonth?: List<Value<number>>;
  IsCustomActionTimeoutEnabled?: Value<boolean>;
  HoursOfDay?: List<Value<number>>;
  constructor(properties: MaintenanceWindow) {
    Object.assign(this, properties);
  }
}
export interface CloudExadataInfrastructureProperties {
  StorageServerType?: Value<string>;
  DatabaseServerType?: Value<string>;
  Shape?: Value<string>;
  StorageCount?: Value<number>;
  DisplayName?: Value<string>;
  AvailabilityZoneId?: Value<string>;
  CustomerContactsToSendToOCI?: List<CustomerContact>;
  AvailabilityZone?: Value<string>;
  MaintenanceWindow?: MaintenanceWindow;
  Tags?: List<ResourceTag>;
  ComputeCount?: Value<number>;
}
export default class CloudExadataInfrastructure extends ResourceBase<CloudExadataInfrastructureProperties> {
  static CustomerContact = CustomerContact;
  static MaintenanceWindow = MaintenanceWindow;
  constructor(properties?: CloudExadataInfrastructureProperties) {
    super('AWS::ODB::CloudExadataInfrastructure', properties || {});
  }
}
