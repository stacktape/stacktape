import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class RegistrationConfig {
  TemplateName?: Value<string>;
  TemplateBody?: Value<string>;
  RoleArn?: Value<string>;
  constructor(properties: RegistrationConfig) {
    Object.assign(this, properties);
  }
}
export interface CACertificateProperties {
  Status: Value<string>;
  CACertificatePem: Value<string>;
  CertificateMode?: Value<string>;
  AutoRegistrationStatus?: Value<string>;
  RemoveAutoRegistration?: Value<boolean>;
  RegistrationConfig?: RegistrationConfig;
  VerificationCertificatePem?: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class CACertificate extends ResourceBase<CACertificateProperties> {
  static RegistrationConfig = RegistrationConfig;
  constructor(properties: CACertificateProperties) {
    super('AWS::IoT::CACertificate', properties);
  }
}
