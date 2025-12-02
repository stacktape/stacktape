import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class HoursOfOperationConfig {
  EndTime!: HoursOfOperationTimeSlice;
  StartTime!: HoursOfOperationTimeSlice;
  Day!: Value<string>;
  constructor(properties: HoursOfOperationConfig) {
    Object.assign(this, properties);
  }
}

export class HoursOfOperationOverride {
  HoursOfOperationOverrideId?: Value<string>;
  OverrideConfig!: List<HoursOfOperationOverrideConfig>;
  EffectiveFrom!: Value<string>;
  OverrideName!: Value<string>;
  OverrideDescription?: Value<string>;
  EffectiveTill!: Value<string>;
  constructor(properties: HoursOfOperationOverride) {
    Object.assign(this, properties);
  }
}

export class HoursOfOperationOverrideConfig {
  EndTime!: OverrideTimeSlice;
  StartTime!: OverrideTimeSlice;
  Day!: Value<string>;
  constructor(properties: HoursOfOperationOverrideConfig) {
    Object.assign(this, properties);
  }
}

export class HoursOfOperationTimeSlice {
  Hours!: Value<number>;
  Minutes!: Value<number>;
  constructor(properties: HoursOfOperationTimeSlice) {
    Object.assign(this, properties);
  }
}

export class OverrideTimeSlice {
  Hours!: Value<number>;
  Minutes!: Value<number>;
  constructor(properties: OverrideTimeSlice) {
    Object.assign(this, properties);
  }
}
export interface HoursOfOperationProperties {
  TimeZone: Value<string>;
  Description?: Value<string>;
  Config: List<HoursOfOperationConfig>;
  InstanceArn: Value<string>;
  Tags?: List<ResourceTag>;
  HoursOfOperationOverrides?: List<HoursOfOperationOverride>;
  Name: Value<string>;
}
export default class HoursOfOperation extends ResourceBase<HoursOfOperationProperties> {
  static HoursOfOperationConfig = HoursOfOperationConfig;
  static HoursOfOperationOverride = HoursOfOperationOverride;
  static HoursOfOperationOverrideConfig = HoursOfOperationOverrideConfig;
  static HoursOfOperationTimeSlice = HoursOfOperationTimeSlice;
  static OverrideTimeSlice = OverrideTimeSlice;
  constructor(properties: HoursOfOperationProperties) {
    super('AWS::Connect::HoursOfOperation', properties);
  }
}
