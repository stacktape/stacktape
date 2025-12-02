import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class DomainValidationOption {
  DomainName!: Value<string>;
  HostedZoneId?: Value<string>;
  ValidationDomain?: Value<string>;
  constructor(properties: DomainValidationOption) {
    Object.assign(this, properties);
  }
}
export interface CertificateProperties {
  CertificateAuthorityArn?: Value<string>;
  CertificateExport?: Value<string>;
  CertificateTransparencyLoggingPreference?: Value<string>;
  DomainName: Value<string>;
  DomainValidationOptions?: List<DomainValidationOption>;
  KeyAlgorithm?: Value<string>;
  SubjectAlternativeNames?: List<Value<string>>;
  Tags?: List<ResourceTag>;
  ValidationMethod?: Value<string>;
}
export default class Certificate extends ResourceBase<CertificateProperties> {
  static DomainValidationOption = DomainValidationOption;
  constructor(properties: CertificateProperties) {
    super('AWS::CertificateManager::Certificate', properties);
  }
}
