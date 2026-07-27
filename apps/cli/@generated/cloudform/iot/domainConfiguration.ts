import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AuthorizerConfig {
  DefaultAuthorizerName?: Value<string>;
  AllowAuthorizerOverride?: Value<boolean>;
  constructor(properties: AuthorizerConfig) {
    Object.assign(this, properties);
  }
}

export class ClientCertificateConfig {
  ClientCertificateCallbackArn?: Value<string>;
  constructor(properties: ClientCertificateConfig) {
    Object.assign(this, properties);
  }
}

export class ServerCertificateConfig {
  EnableOCSPCheck?: Value<boolean>;
  OcspLambdaArn?: Value<string>;
  OcspAuthorizedResponderArn?: Value<string>;
  constructor(properties: ServerCertificateConfig) {
    Object.assign(this, properties);
  }
}

export class ServerCertificateSummary {
  ServerCertificateStatusDetail?: Value<string>;
  ServerCertificateArn?: Value<string>;
  ServerCertificateStatus?: Value<string>;
  constructor(properties: ServerCertificateSummary) {
    Object.assign(this, properties);
  }
}

export class TlsConfig {
  SecurityPolicy?: Value<string>;
  constructor(properties: TlsConfig) {
    Object.assign(this, properties);
  }
}
export interface DomainConfigurationProperties {
  ApplicationProtocol?: Value<string>;
  ClientCertificateConfig?: ClientCertificateConfig;
  DomainConfigurationName?: Value<string>;
  DomainName?: Value<string>;
  DomainConfigurationStatus?: Value<string>;
  ServerCertificateArns?: List<Value<string>>;
  ServerCertificateConfig?: ServerCertificateConfig;
  AuthorizerConfig?: AuthorizerConfig;
  ServiceType?: Value<string>;
  ValidationCertificateArn?: Value<string>;
  TlsConfig?: TlsConfig;
  Tags?: List<ResourceTag>;
  AuthenticationType?: Value<string>;
}
export default class DomainConfiguration extends ResourceBase<DomainConfigurationProperties> {
  static AuthorizerConfig = AuthorizerConfig;
  static ClientCertificateConfig = ClientCertificateConfig;
  static ServerCertificateConfig = ServerCertificateConfig;
  static ServerCertificateSummary = ServerCertificateSummary;
  static TlsConfig = TlsConfig;
  constructor(properties?: DomainConfigurationProperties) {
    super('AWS::IoT::DomainConfiguration', properties || {});
  }
}
