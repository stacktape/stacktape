import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class PrivateDnsPropertiesMutable {
  SOA?: SOA;
  constructor(properties: PrivateDnsPropertiesMutable) {
    Object.assign(this, properties);
  }
}

export class Properties {
  DnsProperties?: PrivateDnsPropertiesMutable;
  constructor(properties: Properties) {
    Object.assign(this, properties);
  }
}

export class SOA {
  TTL?: Value<number>;
  constructor(properties: SOA) {
    Object.assign(this, properties);
  }
}
export interface PrivateDnsNamespaceProperties {
  Description?: Value<string>;
  Vpc: Value<string>;
  Properties?: Properties;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
}
export default class PrivateDnsNamespace extends ResourceBase<PrivateDnsNamespaceProperties> {
  static PrivateDnsPropertiesMutable = PrivateDnsPropertiesMutable;
  static Properties = Properties;
  static SOA = SOA;
  constructor(properties: PrivateDnsNamespaceProperties) {
    super('AWS::ServiceDiscovery::PrivateDnsNamespace', properties);
  }
}
