import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class MuteTargets {
  AlarmNames!: List<Value<string>>;
  constructor(properties: MuteTargets) {
    Object.assign(this, properties);
  }
}

export class Rule {
  Schedule!: Schedule;
  constructor(properties: Rule) {
    Object.assign(this, properties);
  }
}

export class Schedule {
  Timezone?: Value<string>;
  Expression!: Value<string>;
  Duration!: Value<string>;
  constructor(properties: Schedule) {
    Object.assign(this, properties);
  }
}
export interface AlarmMuteRuleProperties {
  StartDate?: Value<string>;
  MuteTargets?: MuteTargets;
  Description?: Value<string>;
  ExpireDate?: Value<string>;
  Rule: Rule;
  Tags?: List<ResourceTag>;
  Name?: Value<string>;
}
export default class AlarmMuteRule extends ResourceBase<AlarmMuteRuleProperties> {
  static MuteTargets = MuteTargets;
  static Rule = Rule;
  static Schedule = Schedule;
  constructor(properties: AlarmMuteRuleProperties) {
    super('AWS::CloudWatch::AlarmMuteRule', properties);
  }
}
