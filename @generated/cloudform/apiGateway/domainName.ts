import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class EndpointConfiguration {
  IpAddressType?: Value<string>;
  Types?: List<Value<string>>;
  constructor(properties: EndpointConfiguration) {
    Object.assign(this, properties);
  }
}

export class MutualTlsAuthentication {
  TruststoreVersion?: Value<string>;
  TruststoreUri?: Value<string>;
  constructor(properties: MutualTlsAuthentication) {
    Object.assign(this, properties);
  }
}
export interface DomainNameProperties {
  OwnershipVerificationCertificateArn?: Value<string>;
  MutualTlsAuthentication?: MutualTlsAuthentication;
  RoutingMode?: Value<string>;
  DomainName?: Value<string>;
  SecurityPolicy?: Value<string>;
  EndpointConfiguration?: EndpointConfiguration;
  RegionalCertificateArn?: Value<string>;
  Tags?: List<ResourceTag>;
  CertificateArn?: Value<string>;
}
export default class DomainName extends ResourceBase<DomainNameProperties> {
  static EndpointConfiguration = EndpointConfiguration;
  static MutualTlsAuthentication = MutualTlsAuthentication;
  constructor(properties?: DomainNameProperties) {
    super('AWS::ApiGateway::DomainName', properties || {});
  }
}
