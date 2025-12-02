import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class EndpointConfiguration {
  IpAddressType?: Value<string>;
  Types?: List<Value<string>>;
  constructor(properties: EndpointConfiguration) {
    Object.assign(this, properties);
  }
}
export interface DomainNameV2Properties {
  Policy?: { [key: string]: any };
  RoutingMode?: Value<string>;
  DomainName?: Value<string>;
  SecurityPolicy?: Value<string>;
  EndpointConfiguration?: EndpointConfiguration;
  Tags?: List<ResourceTag>;
  CertificateArn?: Value<string>;
}
export default class DomainNameV2 extends ResourceBase<DomainNameV2Properties> {
  static EndpointConfiguration = EndpointConfiguration;
  constructor(properties?: DomainNameV2Properties) {
    super('AWS::ApiGateway::DomainNameV2', properties || {});
  }
}
