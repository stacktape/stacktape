import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class Alarms {
  NotificationLambdaArn?: Value<string>;
  AlarmRoleArn?: Value<string>;
  constructor(properties: Alarms) {
    Object.assign(this, properties);
  }
}

export class PortalTypeEntry {
  PortalTools!: List<Value<string>>;
  constructor(properties: PortalTypeEntry) {
    Object.assign(this, properties);
  }
}
export interface PortalProperties {
  PortalName: Value<string>;
  PortalAuthMode?: Value<string>;
  NotificationSenderEmail?: Value<string>;
  Alarms?: Alarms;
  PortalTypeConfiguration?: { [key: string]: PortalTypeEntry };
  PortalContactEmail: Value<string>;
  RoleArn: Value<string>;
  PortalType?: Value<string>;
  Tags?: List<ResourceTag>;
  PortalDescription?: Value<string>;
}
export default class Portal extends ResourceBase<PortalProperties> {
  static Alarms = Alarms;
  static PortalTypeEntry = PortalTypeEntry;
  constructor(properties: PortalProperties) {
    super('AWS::IoTSiteWise::Portal', properties);
  }
}
