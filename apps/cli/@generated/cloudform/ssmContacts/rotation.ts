import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class CoverageTime {
  EndTime!: Value<string>;
  StartTime!: Value<string>;
  constructor(properties: CoverageTime) {
    Object.assign(this, properties);
  }
}

export class MonthlySetting {
  DayOfMonth!: Value<number>;
  HandOffTime!: Value<string>;
  constructor(properties: MonthlySetting) {
    Object.assign(this, properties);
  }
}

export class RecurrenceSettings {
  DailySettings?: List<Value<string>>;
  NumberOfOnCalls!: Value<number>;
  ShiftCoverages?: List<ShiftCoverage>;
  WeeklySettings?: List<WeeklySetting>;
  RecurrenceMultiplier!: Value<number>;
  MonthlySettings?: List<MonthlySetting>;
  constructor(properties: RecurrenceSettings) {
    Object.assign(this, properties);
  }
}

export class ShiftCoverage {
  DayOfWeek!: Value<string>;
  CoverageTimes!: List<CoverageTime>;
  constructor(properties: ShiftCoverage) {
    Object.assign(this, properties);
  }
}

export class WeeklySetting {
  DayOfWeek!: Value<string>;
  HandOffTime!: Value<string>;
  constructor(properties: WeeklySetting) {
    Object.assign(this, properties);
  }
}
export interface RotationProperties {
  Recurrence: RecurrenceSettings;
  TimeZoneId: Value<string>;
  StartTime: Value<string>;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
  ContactIds: List<Value<string>>;
}
export default class Rotation extends ResourceBase<RotationProperties> {
  static CoverageTime = CoverageTime;
  static MonthlySetting = MonthlySetting;
  static RecurrenceSettings = RecurrenceSettings;
  static ShiftCoverage = ShiftCoverage;
  static WeeklySetting = WeeklySetting;
  constructor(properties: RotationProperties) {
    super('AWS::SSMContacts::Rotation', properties);
  }
}
