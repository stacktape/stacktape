import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class DnsConfig {
  DnsRecords!: List<DnsRecord>;
  RoutingPolicy?: Value<string>;
  NamespaceId?: Value<string>;
  constructor(properties: DnsConfig) {
    Object.assign(this, properties);
  }
}

export class DnsRecord {
  Type!: Value<string>;
  TTL!: Value<number>;
  constructor(properties: DnsRecord) {
    Object.assign(this, properties);
  }
}

export class HealthCheckConfig {
  Type!: Value<string>;
  ResourcePath?: Value<string>;
  FailureThreshold?: Value<number>;
  constructor(properties: HealthCheckConfig) {
    Object.assign(this, properties);
  }
}

export class HealthCheckCustomConfig {
  FailureThreshold?: Value<number>;
  constructor(properties: HealthCheckCustomConfig) {
    Object.assign(this, properties);
  }
}
export interface ServiceProperties {
  Type?: Value<string>;
  Description?: Value<string>;
  HealthCheckCustomConfig?: HealthCheckCustomConfig;
  DnsConfig?: DnsConfig;
  ServiceAttributes?: { [key: string]: any };
  NamespaceId?: Value<string>;
  HealthCheckConfig?: HealthCheckConfig;
  Tags?: List<ResourceTag>;
  Name?: Value<string>;
}
export default class Service extends ResourceBase<ServiceProperties> {
  static DnsConfig = DnsConfig;
  static DnsRecord = DnsRecord;
  static HealthCheckConfig = HealthCheckConfig;
  static HealthCheckCustomConfig = HealthCheckCustomConfig;
  constructor(properties?: ServiceProperties) {
    super('AWS::ServiceDiscovery::Service', properties || {});
  }
}
