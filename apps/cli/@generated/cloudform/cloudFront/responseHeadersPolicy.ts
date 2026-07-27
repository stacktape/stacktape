import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class AccessControlAllowHeaders {
  Items!: List<Value<string>>;
  constructor(properties: AccessControlAllowHeaders) {
    Object.assign(this, properties);
  }
}

export class AccessControlAllowMethods {
  Items!: List<Value<string>>;
  constructor(properties: AccessControlAllowMethods) {
    Object.assign(this, properties);
  }
}

export class AccessControlAllowOrigins {
  Items!: List<Value<string>>;
  constructor(properties: AccessControlAllowOrigins) {
    Object.assign(this, properties);
  }
}

export class AccessControlExposeHeaders {
  Items!: List<Value<string>>;
  constructor(properties: AccessControlExposeHeaders) {
    Object.assign(this, properties);
  }
}

export class ContentSecurityPolicy {
  ContentSecurityPolicy!: Value<string>;
  Override!: Value<boolean>;
  constructor(properties: ContentSecurityPolicy) {
    Object.assign(this, properties);
  }
}

export class ContentTypeOptions {
  Override!: Value<boolean>;
  constructor(properties: ContentTypeOptions) {
    Object.assign(this, properties);
  }
}

export class CorsConfig {
  AccessControlAllowCredentials!: Value<boolean>;
  AccessControlAllowHeaders!: AccessControlAllowHeaders;
  OriginOverride!: Value<boolean>;
  AccessControlAllowMethods!: AccessControlAllowMethods;
  AccessControlExposeHeaders?: AccessControlExposeHeaders;
  AccessControlAllowOrigins!: AccessControlAllowOrigins;
  AccessControlMaxAgeSec?: Value<number>;
  constructor(properties: CorsConfig) {
    Object.assign(this, properties);
  }
}

export class CustomHeader {
  Header!: Value<string>;
  Value!: Value<string>;
  Override!: Value<boolean>;
  constructor(properties: CustomHeader) {
    Object.assign(this, properties);
  }
}

export class CustomHeadersConfig {
  Items!: List<CustomHeader>;
  constructor(properties: CustomHeadersConfig) {
    Object.assign(this, properties);
  }
}

export class FrameOptions {
  FrameOption!: Value<string>;
  Override!: Value<boolean>;
  constructor(properties: FrameOptions) {
    Object.assign(this, properties);
  }
}

export class ReferrerPolicy {
  Override!: Value<boolean>;
  ReferrerPolicy!: Value<string>;
  constructor(properties: ReferrerPolicy) {
    Object.assign(this, properties);
  }
}

export class RemoveHeader {
  Header!: Value<string>;
  constructor(properties: RemoveHeader) {
    Object.assign(this, properties);
  }
}

export class RemoveHeadersConfig {
  Items!: List<RemoveHeader>;
  constructor(properties: RemoveHeadersConfig) {
    Object.assign(this, properties);
  }
}

export class ResponseHeadersPolicyConfig {
  Comment?: Value<string>;
  SecurityHeadersConfig?: SecurityHeadersConfig;
  RemoveHeadersConfig?: RemoveHeadersConfig;
  CorsConfig?: CorsConfig;
  ServerTimingHeadersConfig?: ServerTimingHeadersConfig;
  CustomHeadersConfig?: CustomHeadersConfig;
  Name!: Value<string>;
  constructor(properties: ResponseHeadersPolicyConfig) {
    Object.assign(this, properties);
  }
}

export class SecurityHeadersConfig {
  ContentSecurityPolicy?: ContentSecurityPolicy;
  FrameOptions?: FrameOptions;
  ContentTypeOptions?: ContentTypeOptions;
  StrictTransportSecurity?: StrictTransportSecurity;
  XSSProtection?: XSSProtection;
  ReferrerPolicy?: ReferrerPolicy;
  constructor(properties: SecurityHeadersConfig) {
    Object.assign(this, properties);
  }
}

export class ServerTimingHeadersConfig {
  Enabled!: Value<boolean>;
  SamplingRate?: Value<number>;
  constructor(properties: ServerTimingHeadersConfig) {
    Object.assign(this, properties);
  }
}

export class StrictTransportSecurity {
  Preload?: Value<boolean>;
  AccessControlMaxAgeSec!: Value<number>;
  IncludeSubdomains?: Value<boolean>;
  Override!: Value<boolean>;
  constructor(properties: StrictTransportSecurity) {
    Object.assign(this, properties);
  }
}

export class XSSProtection {
  ReportUri?: Value<string>;
  Override!: Value<boolean>;
  Protection!: Value<boolean>;
  ModeBlock?: Value<boolean>;
  constructor(properties: XSSProtection) {
    Object.assign(this, properties);
  }
}
export interface ResponseHeadersPolicyProperties {
  ResponseHeadersPolicyConfig: ResponseHeadersPolicyConfig;
}
export default class ResponseHeadersPolicy extends ResourceBase<ResponseHeadersPolicyProperties> {
  static AccessControlAllowHeaders = AccessControlAllowHeaders;
  static AccessControlAllowMethods = AccessControlAllowMethods;
  static AccessControlAllowOrigins = AccessControlAllowOrigins;
  static AccessControlExposeHeaders = AccessControlExposeHeaders;
  static ContentSecurityPolicy = ContentSecurityPolicy;
  static ContentTypeOptions = ContentTypeOptions;
  static CorsConfig = CorsConfig;
  static CustomHeader = CustomHeader;
  static CustomHeadersConfig = CustomHeadersConfig;
  static FrameOptions = FrameOptions;
  static ReferrerPolicy = ReferrerPolicy;
  static RemoveHeader = RemoveHeader;
  static RemoveHeadersConfig = RemoveHeadersConfig;
  static ResponseHeadersPolicyConfig = ResponseHeadersPolicyConfig;
  static SecurityHeadersConfig = SecurityHeadersConfig;
  static ServerTimingHeadersConfig = ServerTimingHeadersConfig;
  static StrictTransportSecurity = StrictTransportSecurity;
  static XSSProtection = XSSProtection;
  constructor(properties: ResponseHeadersPolicyProperties) {
    super('AWS::CloudFront::ResponseHeadersPolicy', properties);
  }
}
