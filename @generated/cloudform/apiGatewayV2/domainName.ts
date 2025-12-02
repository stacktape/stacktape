import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class DomainNameConfiguration {
  OwnershipVerificationCertificateArn?: Value<string>;
  IpAddressType?: Value<string>;
  SecurityPolicy?: Value<string>;
  EndpointType?: Value<string>;
  CertificateName?: Value<string>;
  CertificateArn?: Value<string>;
  constructor(properties: DomainNameConfiguration) {
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
  MutualTlsAuthentication?: MutualTlsAuthentication;
  RoutingMode?: Value<string>;
  DomainName: Value<string>;
  DomainNameConfigurations?: List<DomainNameConfiguration>;
  Tags?: { [key: string]: Value<string> };
}
export default class DomainName extends ResourceBase<DomainNameProperties> {
  static DomainNameConfiguration = DomainNameConfiguration;
  static MutualTlsAuthentication = MutualTlsAuthentication;
  constructor(properties: DomainNameProperties) {
    super('AWS::ApiGatewayV2::DomainName', properties);
  }
}
