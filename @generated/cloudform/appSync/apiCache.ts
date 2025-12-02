import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface ApiCacheProperties {
  Type: Value<string>;
  TransitEncryptionEnabled?: Value<boolean>;
  HealthMetricsConfig?: Value<string>;
  AtRestEncryptionEnabled?: Value<boolean>;
  ApiId: Value<string>;
  ApiCachingBehavior: Value<string>;
  Ttl: Value<number>;
}
export default class ApiCache extends ResourceBase<ApiCacheProperties> {
  constructor(properties: ApiCacheProperties) {
    super('AWS::AppSync::ApiCache', properties);
  }
}
