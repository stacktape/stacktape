import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AttachmentsConfiguration {
  AttachmentsControlMode!: Value<string>;
  constructor(properties: AttachmentsConfiguration) {
    Object.assign(this, properties);
  }
}

export class AutoSubscriptionConfiguration {
  DefaultSubscriptionType?: Value<string>;
  AutoSubscribe!: Value<string>;
  constructor(properties: AutoSubscriptionConfiguration) {
    Object.assign(this, properties);
  }
}

export class EncryptionConfiguration {
  KmsKeyId?: Value<string>;
  constructor(properties: EncryptionConfiguration) {
    Object.assign(this, properties);
  }
}

export class PersonalizationConfiguration {
  PersonalizationControlMode!: Value<string>;
  constructor(properties: PersonalizationConfiguration) {
    Object.assign(this, properties);
  }
}

export class QAppsConfiguration {
  QAppsControlMode!: Value<string>;
  constructor(properties: QAppsConfiguration) {
    Object.assign(this, properties);
  }
}

export class QuickSightConfiguration {
  ClientNamespace!: Value<string>;
  constructor(properties: QuickSightConfiguration) {
    Object.assign(this, properties);
  }
}
export interface ApplicationProperties {
  IdentityType?: Value<string>;
  Description?: Value<string>;
  IdentityCenterInstanceArn?: Value<string>;
  EncryptionConfiguration?: EncryptionConfiguration;
  IamIdentityProviderArn?: Value<string>;
  RoleArn?: Value<string>;
  AttachmentsConfiguration?: AttachmentsConfiguration;
  ClientIdsForOIDC?: List<Value<string>>;
  QuickSightConfiguration?: QuickSightConfiguration;
  PersonalizationConfiguration?: PersonalizationConfiguration;
  DisplayName: Value<string>;
  AutoSubscriptionConfiguration?: AutoSubscriptionConfiguration;
  QAppsConfiguration?: QAppsConfiguration;
  Tags?: List<ResourceTag>;
}
export default class Application extends ResourceBase<ApplicationProperties> {
  static AttachmentsConfiguration = AttachmentsConfiguration;
  static AutoSubscriptionConfiguration = AutoSubscriptionConfiguration;
  static EncryptionConfiguration = EncryptionConfiguration;
  static PersonalizationConfiguration = PersonalizationConfiguration;
  static QAppsConfiguration = QAppsConfiguration;
  static QuickSightConfiguration = QuickSightConfiguration;
  constructor(properties: ApplicationProperties) {
    super('AWS::QBusiness::Application', properties);
  }
}
