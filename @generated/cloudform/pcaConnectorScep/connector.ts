import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class IntuneConfiguration {
  AzureApplicationId!: Value<string>;
  Domain!: Value<string>;
  constructor(properties: IntuneConfiguration) {
    Object.assign(this, properties);
  }
}

export class MobileDeviceManagement {
  Intune!: IntuneConfiguration;
  constructor(properties: MobileDeviceManagement) {
    Object.assign(this, properties);
  }
}

export class OpenIdConfiguration {
  Issuer?: Value<string>;
  Audience?: Value<string>;
  Subject?: Value<string>;
  constructor(properties: OpenIdConfiguration) {
    Object.assign(this, properties);
  }
}
export interface ConnectorProperties {
  CertificateAuthorityArn: Value<string>;
  MobileDeviceManagement?: MobileDeviceManagement;
  Tags?: { [key: string]: Value<string> };
}
export default class Connector extends ResourceBase<ConnectorProperties> {
  static IntuneConfiguration = IntuneConfiguration;
  static MobileDeviceManagement = MobileDeviceManagement;
  static OpenIdConfiguration = OpenIdConfiguration;
  constructor(properties: ConnectorProperties) {
    super('AWS::PCAConnectorSCEP::Connector', properties);
  }
}
