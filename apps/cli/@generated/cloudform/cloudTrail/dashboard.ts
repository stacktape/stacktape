import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class Frequency {
  Value!: Value<number>;
  Unit!: Value<string>;
  constructor(properties: Frequency) {
    Object.assign(this, properties);
  }
}

export class RefreshSchedule {
  Status?: Value<string>;
  TimeOfDay?: Value<string>;
  Frequency?: Frequency;
  constructor(properties: RefreshSchedule) {
    Object.assign(this, properties);
  }
}

export class Widget {
  QueryStatement!: Value<string>;
  QueryParameters?: List<Value<string>>;
  ViewProperties?: { [key: string]: Value<string> };
  constructor(properties: Widget) {
    Object.assign(this, properties);
  }
}
export interface DashboardProperties {
  Widgets?: List<Widget>;
  TerminationProtectionEnabled?: Value<boolean>;
  RefreshSchedule?: RefreshSchedule;
  Tags?: List<ResourceTag>;
  Name?: Value<string>;
}
export default class Dashboard extends ResourceBase<DashboardProperties> {
  static Frequency = Frequency;
  static RefreshSchedule = RefreshSchedule;
  static Widget = Widget;
  constructor(properties?: DashboardProperties) {
    super('AWS::CloudTrail::Dashboard', properties || {});
  }
}
