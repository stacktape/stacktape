import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class ConfigurationSetAttributes {
  ConfigurationSetName?: Value<string>;
  constructor(properties: ConfigurationSetAttributes) {
    Object.assign(this, properties);
  }
}

export class DkimAttributes {
  SigningEnabled?: Value<boolean>;
  constructor(properties: DkimAttributes) {
    Object.assign(this, properties);
  }
}

export class DkimSigningAttributes {
  DomainSigningPrivateKey?: Value<string>;
  DomainSigningSelector?: Value<string>;
  NextSigningKeyLength?: Value<string>;
  constructor(properties: DkimSigningAttributes) {
    Object.assign(this, properties);
  }
}

export class FeedbackAttributes {
  EmailForwardingEnabled?: Value<boolean>;
  constructor(properties: FeedbackAttributes) {
    Object.assign(this, properties);
  }
}

export class MailFromAttributes {
  MailFromDomain?: Value<string>;
  BehaviorOnMxFailure?: Value<string>;
  constructor(properties: MailFromAttributes) {
    Object.assign(this, properties);
  }
}
export interface EmailIdentityProperties {
  ConfigurationSetAttributes?: ConfigurationSetAttributes;
  EmailIdentity: Value<string>;
  DkimSigningAttributes?: DkimSigningAttributes;
  DkimAttributes?: DkimAttributes;
  FeedbackAttributes?: FeedbackAttributes;
  Tags?: List<ResourceTag>;
  MailFromAttributes?: MailFromAttributes;
}
export default class EmailIdentity extends ResourceBase<EmailIdentityProperties> {
  static ConfigurationSetAttributes = ConfigurationSetAttributes;
  static DkimAttributes = DkimAttributes;
  static DkimSigningAttributes = DkimSigningAttributes;
  static FeedbackAttributes = FeedbackAttributes;
  static MailFromAttributes = MailFromAttributes;
  constructor(properties: EmailIdentityProperties) {
    super('AWS::SES::EmailIdentity', properties);
  }
}
