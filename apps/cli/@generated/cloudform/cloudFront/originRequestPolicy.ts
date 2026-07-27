import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class CookiesConfig {
  Cookies?: List<Value<string>>;
  CookieBehavior!: Value<string>;
  constructor(properties: CookiesConfig) {
    Object.assign(this, properties);
  }
}

export class HeadersConfig {
  Headers?: List<Value<string>>;
  HeaderBehavior!: Value<string>;
  constructor(properties: HeadersConfig) {
    Object.assign(this, properties);
  }
}

export class OriginRequestPolicyConfig {
  Comment?: Value<string>;
  HeadersConfig!: HeadersConfig;
  CookiesConfig!: CookiesConfig;
  QueryStringsConfig!: QueryStringsConfig;
  Name!: Value<string>;
  constructor(properties: OriginRequestPolicyConfig) {
    Object.assign(this, properties);
  }
}

export class QueryStringsConfig {
  QueryStrings?: List<Value<string>>;
  QueryStringBehavior!: Value<string>;
  constructor(properties: QueryStringsConfig) {
    Object.assign(this, properties);
  }
}
export interface OriginRequestPolicyProperties {
  OriginRequestPolicyConfig: OriginRequestPolicyConfig;
}
export default class OriginRequestPolicy extends ResourceBase<OriginRequestPolicyProperties> {
  static CookiesConfig = CookiesConfig;
  static HeadersConfig = HeadersConfig;
  static OriginRequestPolicyConfig = OriginRequestPolicyConfig;
  static QueryStringsConfig = QueryStringsConfig;
  constructor(properties: OriginRequestPolicyProperties) {
    super('AWS::CloudFront::OriginRequestPolicy', properties);
  }
}
