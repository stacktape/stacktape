import { ResourceBase, ResourceTag } from '../resource';
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
  DurationInMinutes?: Value<number>;
  RotationIds?: List<Value<string>>;
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
export interface ContactProperties {
  Type: Value<string>;
  Alias: Value<string>;
  DisplayName: Value<string>;
  Plan?: List<Stage>;
  Tags?: List<ResourceTag>;
}
export default class Contact extends ResourceBase<ContactProperties> {
  static ChannelTargetInfo = ChannelTargetInfo;
  static ContactTargetInfo = ContactTargetInfo;
  static Stage = Stage;
  static Targets = Targets;
  constructor(properties: ContactProperties) {
    super('AWS::SSMContacts::Contact', properties);
  }
}
