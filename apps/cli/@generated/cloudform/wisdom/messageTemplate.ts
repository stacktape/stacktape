import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AgentAttributes {
  FirstName?: Value<string>;
  LastName?: Value<string>;
  constructor(properties: AgentAttributes) {
    Object.assign(this, properties);
  }
}

export class Content {
  EmailMessageTemplateContent?: EmailMessageTemplateContent;
  SmsMessageTemplateContent?: SmsMessageTemplateContent;
  constructor(properties: Content) {
    Object.assign(this, properties);
  }
}

export class CustomerProfileAttributes {
  ProfileId?: Value<string>;
  BillingCity?: Value<string>;
  Gender?: Value<string>;
  ProfileARN?: Value<string>;
  BillingProvince?: Value<string>;
  BillingPostalCode?: Value<string>;
  ShippingAddress1?: Value<string>;
  BusinessName?: Value<string>;
  ShippingAddress4?: Value<string>;
  ShippingAddress3?: Value<string>;
  ShippingAddress2?: Value<string>;
  MailingCity?: Value<string>;
  BusinessPhoneNumber?: Value<string>;
  City?: Value<string>;
  EmailAddress?: Value<string>;
  Province?: Value<string>;
  State?: Value<string>;
  ShippingPostalCode?: Value<string>;
  Country?: Value<string>;
  ShippingState?: Value<string>;
  LastName?: Value<string>;
  BillingCounty?: Value<string>;
  BillingState?: Value<string>;
  BirthDate?: Value<string>;
  BusinessEmailAddress?: Value<string>;
  MailingCountry?: Value<string>;
  PostalCode?: Value<string>;
  ShippingProvince?: Value<string>;
  MailingCounty?: Value<string>;
  MobilePhoneNumber?: Value<string>;
  County?: Value<string>;
  MailingState?: Value<string>;
  HomePhoneNumber?: Value<string>;
  Address4?: Value<string>;
  MailingPostalCode?: Value<string>;
  MailingAddress3?: Value<string>;
  ShippingCountry?: Value<string>;
  MailingAddress4?: Value<string>;
  ShippingCity?: Value<string>;
  MailingAddress1?: Value<string>;
  MailingAddress2?: Value<string>;
  PartyType?: Value<string>;
  AdditionalInformation?: Value<string>;
  MailingProvince?: Value<string>;
  BillingAddress1?: Value<string>;
  BillingAddress2?: Value<string>;
  FirstName?: Value<string>;
  BillingAddress3?: Value<string>;
  BillingAddress4?: Value<string>;
  Address2?: Value<string>;
  Address3?: Value<string>;
  Custom?: { [key: string]: Value<string> };
  Address1?: Value<string>;
  MiddleName?: Value<string>;
  AccountNumber?: Value<string>;
  ShippingCounty?: Value<string>;
  BillingCountry?: Value<string>;
  PhoneNumber?: Value<string>;
  constructor(properties: CustomerProfileAttributes) {
    Object.assign(this, properties);
  }
}

export class EmailMessageTemplateContent {
  Headers!: List<EmailMessageTemplateHeader>;
  Body!: EmailMessageTemplateContentBody;
  Subject!: Value<string>;
  constructor(properties: EmailMessageTemplateContent) {
    Object.assign(this, properties);
  }
}

export class EmailMessageTemplateContentBody {
  PlainText?: MessageTemplateBodyContentProvider;
  Html?: MessageTemplateBodyContentProvider;
  constructor(properties: EmailMessageTemplateContentBody) {
    Object.assign(this, properties);
  }
}

export class EmailMessageTemplateHeader {
  Value?: Value<string>;
  Name?: Value<string>;
  constructor(properties: EmailMessageTemplateHeader) {
    Object.assign(this, properties);
  }
}

export class GroupingConfiguration {
  Values!: List<Value<string>>;
  Criteria!: Value<string>;
  constructor(properties: GroupingConfiguration) {
    Object.assign(this, properties);
  }
}

export class MessageTemplateAttachment {
  AttachmentName!: Value<string>;
  S3PresignedUrl!: Value<string>;
  AttachmentId?: Value<string>;
  constructor(properties: MessageTemplateAttachment) {
    Object.assign(this, properties);
  }
}

export class MessageTemplateAttributes {
  SystemAttributes?: SystemAttributes;
  CustomAttributes?: { [key: string]: Value<string> };
  AgentAttributes?: AgentAttributes;
  CustomerProfileAttributes?: CustomerProfileAttributes;
  constructor(properties: MessageTemplateAttributes) {
    Object.assign(this, properties);
  }
}

export class MessageTemplateBodyContentProvider {
  Content?: Value<string>;
  constructor(properties: MessageTemplateBodyContentProvider) {
    Object.assign(this, properties);
  }
}

export class SmsMessageTemplateContent {
  Body!: SmsMessageTemplateContentBody;
  constructor(properties: SmsMessageTemplateContent) {
    Object.assign(this, properties);
  }
}

export class SmsMessageTemplateContentBody {
  PlainText?: MessageTemplateBodyContentProvider;
  constructor(properties: SmsMessageTemplateContentBody) {
    Object.assign(this, properties);
  }
}

export class SystemAttributes {
  CustomerEndpoint?: SystemEndpointAttributes;
  SystemEndpoint?: SystemEndpointAttributes;
  Name?: Value<string>;
  constructor(properties: SystemAttributes) {
    Object.assign(this, properties);
  }
}

export class SystemEndpointAttributes {
  Address?: Value<string>;
  constructor(properties: SystemEndpointAttributes) {
    Object.assign(this, properties);
  }
}
export interface MessageTemplateProperties {
  MessageTemplateAttachments?: List<MessageTemplateAttachment>;
  Description?: Value<string>;
  Language?: Value<string>;
  Content: Content;
  GroupingConfiguration?: GroupingConfiguration;
  KnowledgeBaseArn: Value<string>;
  ChannelSubtype: Value<string>;
  DefaultAttributes?: MessageTemplateAttributes;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
}
export default class MessageTemplate extends ResourceBase<MessageTemplateProperties> {
  static AgentAttributes = AgentAttributes;
  static Content = Content;
  static CustomerProfileAttributes = CustomerProfileAttributes;
  static EmailMessageTemplateContent = EmailMessageTemplateContent;
  static EmailMessageTemplateContentBody = EmailMessageTemplateContentBody;
  static EmailMessageTemplateHeader = EmailMessageTemplateHeader;
  static GroupingConfiguration = GroupingConfiguration;
  static MessageTemplateAttachment = MessageTemplateAttachment;
  static MessageTemplateAttributes = MessageTemplateAttributes;
  static MessageTemplateBodyContentProvider = MessageTemplateBodyContentProvider;
  static SmsMessageTemplateContent = SmsMessageTemplateContent;
  static SmsMessageTemplateContentBody = SmsMessageTemplateContentBody;
  static SystemAttributes = SystemAttributes;
  static SystemEndpointAttributes = SystemEndpointAttributes;
  constructor(properties: MessageTemplateProperties) {
    super('AWS::Wisdom::MessageTemplate', properties);
  }
}
