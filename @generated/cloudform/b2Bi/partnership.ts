import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class CapabilityOptions {
  InboundEdi?: InboundEdiOptions;
  OutboundEdi?: OutboundEdiOptions;
  constructor(properties: CapabilityOptions) {
    Object.assign(this, properties);
  }
}

export class InboundEdiOptions {
  X12?: X12InboundEdiOptions;
  constructor(properties: InboundEdiOptions) {
    Object.assign(this, properties);
  }
}

export class OutboundEdiOptions {
  X12!: X12Envelope;
  constructor(properties: OutboundEdiOptions) {
    Object.assign(this, properties);
  }
}

export class WrapOptions {
  LineLength?: Value<number>;
  WrapBy?: Value<string>;
  LineTerminator?: Value<string>;
  constructor(properties: WrapOptions) {
    Object.assign(this, properties);
  }
}

export class X12AcknowledgmentOptions {
  TechnicalAcknowledgment!: Value<string>;
  FunctionalAcknowledgment!: Value<string>;
  constructor(properties: X12AcknowledgmentOptions) {
    Object.assign(this, properties);
  }
}

export class X12ControlNumbers {
  StartingFunctionalGroupControlNumber?: Value<number>;
  StartingInterchangeControlNumber?: Value<number>;
  StartingTransactionSetControlNumber?: Value<number>;
  constructor(properties: X12ControlNumbers) {
    Object.assign(this, properties);
  }
}

export class X12Delimiters {
  SegmentTerminator?: Value<string>;
  ComponentSeparator?: Value<string>;
  DataElementSeparator?: Value<string>;
  constructor(properties: X12Delimiters) {
    Object.assign(this, properties);
  }
}

export class X12Envelope {
  WrapOptions?: WrapOptions;
  Common?: X12OutboundEdiHeaders;
  constructor(properties: X12Envelope) {
    Object.assign(this, properties);
  }
}

export class X12FunctionalGroupHeaders {
  ApplicationSenderCode?: Value<string>;
  ApplicationReceiverCode?: Value<string>;
  ResponsibleAgencyCode?: Value<string>;
  constructor(properties: X12FunctionalGroupHeaders) {
    Object.assign(this, properties);
  }
}

export class X12InboundEdiOptions {
  AcknowledgmentOptions?: X12AcknowledgmentOptions;
  constructor(properties: X12InboundEdiOptions) {
    Object.assign(this, properties);
  }
}

export class X12InterchangeControlHeaders {
  ReceiverId?: Value<string>;
  AcknowledgmentRequestedCode?: Value<string>;
  SenderIdQualifier?: Value<string>;
  UsageIndicatorCode?: Value<string>;
  RepetitionSeparator?: Value<string>;
  SenderId?: Value<string>;
  ReceiverIdQualifier?: Value<string>;
  constructor(properties: X12InterchangeControlHeaders) {
    Object.assign(this, properties);
  }
}

export class X12OutboundEdiHeaders {
  Delimiters?: X12Delimiters;
  ControlNumbers?: X12ControlNumbers;
  FunctionalGroupHeaders?: X12FunctionalGroupHeaders;
  InterchangeControlHeaders?: X12InterchangeControlHeaders;
  ValidateEdi?: Value<boolean>;
  Gs05TimeFormat?: Value<string>;
  constructor(properties: X12OutboundEdiHeaders) {
    Object.assign(this, properties);
  }
}
export interface PartnershipProperties {
  ProfileId: Value<string>;
  Email: Value<string>;
  Capabilities: List<Value<string>>;
  Phone?: Value<string>;
  CapabilityOptions?: CapabilityOptions;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
}
export default class Partnership extends ResourceBase<PartnershipProperties> {
  static CapabilityOptions = CapabilityOptions;
  static InboundEdiOptions = InboundEdiOptions;
  static OutboundEdiOptions = OutboundEdiOptions;
  static WrapOptions = WrapOptions;
  static X12AcknowledgmentOptions = X12AcknowledgmentOptions;
  static X12ControlNumbers = X12ControlNumbers;
  static X12Delimiters = X12Delimiters;
  static X12Envelope = X12Envelope;
  static X12FunctionalGroupHeaders = X12FunctionalGroupHeaders;
  static X12InboundEdiOptions = X12InboundEdiOptions;
  static X12InterchangeControlHeaders = X12InterchangeControlHeaders;
  static X12OutboundEdiHeaders = X12OutboundEdiHeaders;
  constructor(properties: PartnershipProperties) {
    super('AWS::B2BI::Partnership', properties);
  }
}
