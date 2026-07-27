import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class Properties {
  DnsProperties?: PublicDnsPropertiesMutable;
  constructor(properties: Properties) {
    Object.assign(this, properties);
  }
}

export class PublicDnsPropertiesMutable {
  SOA?: SOA;
  constructor(properties: PublicDnsPropertiesMutable) {
    Object.assign(this, properties);
  }
}

export class SOA {
  TTL?: Value<number>;
  constructor(properties: SOA) {
    Object.assign(this, properties);
  }
}
export interface PublicDnsNamespaceProperties {
  Description?: Value<string>;
  Properties?: Properties;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
}
export default class PublicDnsNamespace extends ResourceBase<PublicDnsNamespaceProperties> {
  static Properties = Properties;
  static PublicDnsPropertiesMutable = PublicDnsPropertiesMutable;
  static SOA = SOA;
  constructor(properties: PublicDnsNamespaceProperties) {
    super('AWS::ServiceDiscovery::PublicDnsNamespace', properties);
  }
}
