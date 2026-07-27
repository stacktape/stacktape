import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class MaintenanceWindow {
  EndTimeMinute?: Value<number>;
  Type!: Value<string>;
  DaysOfTheWeek?: List<Value<string>>;
  ApplyTimeOf?: Value<string>;
  StartTimeMinute?: Value<number>;
  StartTimeHour?: Value<number>;
  EndTimeHour?: Value<number>;
  constructor(properties: MaintenanceWindow) {
    Object.assign(this, properties);
  }
}
export interface EnvironmentProperties {
  DesiredSoftwareSetId?: Value<string>;
  KmsKeyArn?: Value<string>;
  DesktopArn: Value<string>;
  DeviceCreationTags?: List<ResourceTag>;
  SoftwareSetUpdateMode?: Value<string>;
  SoftwareSetUpdateSchedule?: Value<string>;
  MaintenanceWindow?: MaintenanceWindow;
  DesktopEndpoint?: Value<string>;
  Tags?: List<ResourceTag>;
  Name?: Value<string>;
}
export default class Environment extends ResourceBase<EnvironmentProperties> {
  static MaintenanceWindow = MaintenanceWindow;
  constructor(properties: EnvironmentProperties) {
    super('AWS::WorkSpacesThinClient::Environment', properties);
  }
}
