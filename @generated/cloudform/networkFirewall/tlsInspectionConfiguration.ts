import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class Address {
  AddressDefinition!: Value<string>;
  constructor(properties: Address) {
    Object.assign(this, properties);
  }
}

export class CheckCertificateRevocationStatus {
  UnknownStatusAction?: Value<string>;
  RevokedStatusAction?: Value<string>;
  constructor(properties: CheckCertificateRevocationStatus) {
    Object.assign(this, properties);
  }
}

export class PortRange {
  FromPort!: Value<number>;
  ToPort!: Value<number>;
  constructor(properties: PortRange) {
    Object.assign(this, properties);
  }
}

export class ServerCertificate {
  ResourceArn?: Value<string>;
  constructor(properties: ServerCertificate) {
    Object.assign(this, properties);
  }
}

export class ServerCertificateConfiguration {
  CertificateAuthorityArn?: Value<string>;
  CheckCertificateRevocationStatus?: CheckCertificateRevocationStatus;
  Scopes?: List<ServerCertificateScope>;
  ServerCertificates?: List<ServerCertificate>;
  constructor(properties: ServerCertificateConfiguration) {
    Object.assign(this, properties);
  }
}

export class ServerCertificateScope {
  Protocols?: List<Value<number>>;
  DestinationPorts?: List<PortRange>;
  Destinations?: List<Address>;
  Sources?: List<Address>;
  SourcePorts?: List<PortRange>;
  constructor(properties: ServerCertificateScope) {
    Object.assign(this, properties);
  }
}

export class TLSInspectionConfigurationInner {
  ServerCertificateConfigurations?: List<ServerCertificateConfiguration>;
  constructor(properties: TLSInspectionConfigurationInner) {
    Object.assign(this, properties);
  }
}
export interface TLSInspectionConfigurationProperties {
  Description?: Value<string>;
  TLSInspectionConfigurationName: Value<string>;
  Tags?: List<ResourceTag>;
  TLSInspectionConfiguration: TLSInspectionConfiguration;
}
export default class TLSInspectionConfiguration extends ResourceBase<TLSInspectionConfigurationProperties> {
  static Address = Address;
  static CheckCertificateRevocationStatus = CheckCertificateRevocationStatus;
  static PortRange = PortRange;
  static ServerCertificate = ServerCertificate;
  static ServerCertificateConfiguration = ServerCertificateConfiguration;
  static ServerCertificateScope = ServerCertificateScope;
  static TLSInspectionConfiguration = TLSInspectionConfigurationInner;
  constructor(properties: TLSInspectionConfigurationProperties) {
    super('AWS::NetworkFirewall::TLSInspectionConfiguration', properties);
  }
}
