import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class PhoneNumberQuickConnectConfig {
  PhoneNumber!: Value<string>;
  constructor(properties: PhoneNumberQuickConnectConfig) {
    Object.assign(this, properties);
  }
}

export class QueueQuickConnectConfig {
  ContactFlowArn!: Value<string>;
  QueueArn!: Value<string>;
  constructor(properties: QueueQuickConnectConfig) {
    Object.assign(this, properties);
  }
}

export class QuickConnectConfig {
  QueueConfig?: QueueQuickConnectConfig;
  PhoneConfig?: PhoneNumberQuickConnectConfig;
  QuickConnectType!: Value<string>;
  UserConfig?: UserQuickConnectConfig;
  constructor(properties: QuickConnectConfig) {
    Object.assign(this, properties);
  }
}

export class UserQuickConnectConfig {
  UserArn!: Value<string>;
  ContactFlowArn!: Value<string>;
  constructor(properties: UserQuickConnectConfig) {
    Object.assign(this, properties);
  }
}
export interface QuickConnectProperties {
  Description?: Value<string>;
  QuickConnectConfig: QuickConnectConfig;
  InstanceArn: Value<string>;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
}
export default class QuickConnect extends ResourceBase<QuickConnectProperties> {
  static PhoneNumberQuickConnectConfig = PhoneNumberQuickConnectConfig;
  static QueueQuickConnectConfig = QueueQuickConnectConfig;
  static QuickConnectConfig = QuickConnectConfig;
  static UserQuickConnectConfig = UserQuickConnectConfig;
  constructor(properties: QuickConnectProperties) {
    super('AWS::Connect::QuickConnect', properties);
  }
}
