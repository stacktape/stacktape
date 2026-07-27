import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class ChannelTargetInfo {
  RetryIntervalInMinutes!: Value<number>;
  ChannelId!: Value<string>;
  constructor(properties: ChannelTargetInfo) {
    Object.assign(this, properties);
  }
}

export class ContactTargetInfo {
  ContactId!: Value<string>;
  IsEssential!: Value<boolean>;
  constructor(properties: ContactTargetInfo) {
    Object.assign(this, properties);
  }
}

export class Stage {
  DurationInMinutes!: Value<number>;
  Targets?: List<Targets>;
  constructor(properties: Stage) {
    Object.assign(this, properties);
  }
}

export class Targets {
  ChannelTargetInfo?: ChannelTargetInfo;
  ContactTargetInfo?: ContactTargetInfo;
  constructor(properties: Targets) {
    Object.assign(this, properties);
  }
}
export interface PlanProperties {
  RotationIds?: List<Value<string>>;
  Stages?: List<Stage>;
  ContactId: Value<string>;
}
export default class Plan extends ResourceBase<PlanProperties> {
  static ChannelTargetInfo = ChannelTargetInfo;
  static ContactTargetInfo = ContactTargetInfo;
  static Stage = Stage;
  static Targets = Targets;
  constructor(properties: PlanProperties) {
    super('AWS::SSMContacts::Plan', properties);
  }
}
