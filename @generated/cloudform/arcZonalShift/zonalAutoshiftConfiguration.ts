import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class ControlCondition {
  Type!: Value<string>;
  AlarmIdentifier!: Value<string>;
  constructor(properties: ControlCondition) {
    Object.assign(this, properties);
  }
}

export class PracticeRunConfiguration {
  BlockedDates?: List<Value<string>>;
  OutcomeAlarms!: List<ControlCondition>;
  BlockingAlarms?: List<ControlCondition>;
  BlockedWindows?: List<Value<string>>;
  constructor(properties: PracticeRunConfiguration) {
    Object.assign(this, properties);
  }
}
export interface ZonalAutoshiftConfigurationProperties {
  ResourceIdentifier: Value<string>;
  ZonalAutoshiftStatus?: Value<string>;
  PracticeRunConfiguration?: PracticeRunConfiguration;
}
export default class ZonalAutoshiftConfiguration extends ResourceBase<ZonalAutoshiftConfigurationProperties> {
  static ControlCondition = ControlCondition;
  static PracticeRunConfiguration = PracticeRunConfiguration;
  constructor(properties: ZonalAutoshiftConfigurationProperties) {
    super('AWS::ARCZonalShift::ZonalAutoshiftConfiguration', properties);
  }
}
