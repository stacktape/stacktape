import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class CisTargets {
  TargetResourceTags!: { [key: string]: any };
  AccountIds!: List<Value<string>>;
  constructor(properties: CisTargets) {
    Object.assign(this, properties);
  }
}

export class DailySchedule {
  StartTime!: Time;
  constructor(properties: DailySchedule) {
    Object.assign(this, properties);
  }
}

export class MonthlySchedule {
  StartTime!: Time;
  Day!: Value<string>;
  constructor(properties: MonthlySchedule) {
    Object.assign(this, properties);
  }
}

export class Schedule {
  Daily?: DailySchedule;
  Monthly?: MonthlySchedule;
  Weekly?: WeeklySchedule;
  OneTime?: { [key: string]: any };
  constructor(properties: Schedule) {
    Object.assign(this, properties);
  }
}

export class Time {
  TimeOfDay!: Value<string>;
  TimeZone!: Value<string>;
  constructor(properties: Time) {
    Object.assign(this, properties);
  }
}

export class WeeklySchedule {
  Days!: List<Value<string>>;
  StartTime!: Time;
  constructor(properties: WeeklySchedule) {
    Object.assign(this, properties);
  }
}
export interface CisScanConfigurationProperties {
  SecurityLevel: Value<string>;
  Schedule: Schedule;
  Targets: CisTargets;
  ScanName: Value<string>;
  Tags?: { [key: string]: Value<string> };
}
export default class CisScanConfiguration extends ResourceBase<CisScanConfigurationProperties> {
  static CisTargets = CisTargets;
  static DailySchedule = DailySchedule;
  static MonthlySchedule = MonthlySchedule;
  static Schedule = Schedule;
  static Time = Time;
  static WeeklySchedule = WeeklySchedule;
  constructor(properties: CisScanConfigurationProperties) {
    super('AWS::InspectorV2::CisScanConfiguration', properties);
  }
}
