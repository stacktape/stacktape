import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class ApplicationLogs {
  LinkApplicationLogSampling!: LinkApplicationLogSampling;
  constructor(properties: ApplicationLogs) {
    Object.assign(this, properties);
  }
}

export class LinkApplicationLogSampling {
  FilterLog!: Value<number>;
  ErrorLog!: Value<number>;
  constructor(properties: LinkApplicationLogSampling) {
    Object.assign(this, properties);
  }
}

export class LinkAttributes {
  ResponderErrorMasking?: List<ResponderErrorMaskingForHttpCode>;
  CustomerProvidedId?: Value<string>;
  constructor(properties: LinkAttributes) {
    Object.assign(this, properties);
  }
}

export class LinkLogSettings {
  ApplicationLogs!: ApplicationLogs;
  constructor(properties: LinkLogSettings) {
    Object.assign(this, properties);
  }
}

export class ResponderErrorMaskingForHttpCode {
  HttpCode!: Value<string>;
  Action!: Value<string>;
  ResponseLoggingPercentage?: Value<number>;
  LoggingTypes!: List<Value<string>>;
  constructor(properties: ResponderErrorMaskingForHttpCode) {
    Object.assign(this, properties);
  }
}
export interface OutboundExternalLinkProperties {
  LinkAttributes?: LinkAttributes;
  LinkLogSettings: LinkLogSettings;
  PublicEndpoint: Value<string>;
  GatewayId: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class OutboundExternalLink extends ResourceBase<OutboundExternalLinkProperties> {
  static ApplicationLogs = ApplicationLogs;
  static LinkApplicationLogSampling = LinkApplicationLogSampling;
  static LinkAttributes = LinkAttributes;
  static LinkLogSettings = LinkLogSettings;
  static ResponderErrorMaskingForHttpCode = ResponderErrorMaskingForHttpCode;
  constructor(properties: OutboundExternalLinkProperties) {
    super('AWS::RTBFabric::OutboundExternalLink', properties);
  }
}
