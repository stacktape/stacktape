import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class CachePolicyConfig {
  Comment?: Value<string>;
  MinTTL!: Value<number>;
  MaxTTL!: Value<number>;
  ParametersInCacheKeyAndForwardedToOrigin!: ParametersInCacheKeyAndForwardedToOrigin;
  DefaultTTL!: Value<number>;
  Name!: Value<string>;
  constructor(properties: CachePolicyConfig) {
    Object.assign(this, properties);
  }
}

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

export class ParametersInCacheKeyAndForwardedToOrigin {
  EnableAcceptEncodingBrotli?: Value<boolean>;
  HeadersConfig!: HeadersConfig;
  CookiesConfig!: CookiesConfig;
  EnableAcceptEncodingGzip!: Value<boolean>;
  QueryStringsConfig!: QueryStringsConfig;
  constructor(properties: ParametersInCacheKeyAndForwardedToOrigin) {
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
export interface CachePolicyProperties {
  CachePolicyConfig: CachePolicyConfig;
}
export default class CachePolicy extends ResourceBase<CachePolicyProperties> {
  static CachePolicyConfig = CachePolicyConfig;
  static CookiesConfig = CookiesConfig;
  static HeadersConfig = HeadersConfig;
  static ParametersInCacheKeyAndForwardedToOrigin = ParametersInCacheKeyAndForwardedToOrigin;
  static QueryStringsConfig = QueryStringsConfig;
  constructor(properties: CachePolicyProperties) {
    super('AWS::CloudFront::CachePolicy', properties);
  }
}
