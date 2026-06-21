import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class IngressPointConfiguration {
  SecretArn?: Value<string>;
  SmtpPassword?: Value<string>;
  TlsAuthConfiguration?: TlsAuthConfiguration;
  constructor(properties: IngressPointConfiguration) {
    Object.assign(this, properties);
  }
}

export class NetworkConfiguration {
  PublicNetworkConfiguration?: PublicNetworkConfiguration;
  PrivateNetworkConfiguration?: PrivateNetworkConfiguration;
  constructor(properties: NetworkConfiguration) {
    Object.assign(this, properties);
  }
}

export class PrivateNetworkConfiguration {
  VpcEndpointId!: Value<string>;
  constructor(properties: PrivateNetworkConfiguration) {
    Object.assign(this, properties);
  }
}

export class PublicNetworkConfiguration {
  IpType!: { [key: string]: any };
  constructor(properties: PublicNetworkConfiguration) {
    Object.assign(this, properties);
  }
}

export class TlsAuthConfiguration {
  TrustStore!: TrustStore;
  constructor(properties: TlsAuthConfiguration) {
    Object.assign(this, properties);
  }
}

export class TrustStore {
  KmsKeyArn?: Value<string>;
  CrlContent?: Value<string>;
  CAContent!: Value<string>;
  constructor(properties: TrustStore) {
    Object.assign(this, properties);
  }
}
export interface MailManagerIngressPointProperties {
  RuleSetId: Value<string>;
  Type: Value<string>;
  TrafficPolicyId: Value<string>;
  IngressPointName?: Value<string>;
  StatusToUpdate?: Value<string>;
  NetworkConfiguration?: NetworkConfiguration;
  Tags?: List<ResourceTag>;
  IngressPointConfiguration?: IngressPointConfiguration;
  TlsPolicy?: Value<string>;
}
export default class MailManagerIngressPoint extends ResourceBase<MailManagerIngressPointProperties> {
  static IngressPointConfiguration = IngressPointConfiguration;
  static NetworkConfiguration = NetworkConfiguration;
  static PrivateNetworkConfiguration = PrivateNetworkConfiguration;
  static PublicNetworkConfiguration = PublicNetworkConfiguration;
  static TlsAuthConfiguration = TlsAuthConfiguration;
  static TrustStore = TrustStore;
  constructor(properties: MailManagerIngressPointProperties) {
    super('AWS::SES::MailManagerIngressPoint', properties);
  }
}
