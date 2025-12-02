import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class Certificate {
  CertificateType?: Value<string>;
  CertificateVerificationDNSRecord?: Value<string>;
  CertificateArn?: Value<string>;
  constructor(properties: Certificate) {
    Object.assign(this, properties);
  }
}

export class CertificateSettings {
  CertificateType?: Value<string>;
  CustomCertificateArn?: Value<string>;
  constructor(properties: CertificateSettings) {
    Object.assign(this, properties);
  }
}

export class SubDomainSetting {
  Prefix!: Value<string>;
  BranchName!: Value<string>;
  constructor(properties: SubDomainSetting) {
    Object.assign(this, properties);
  }
}
export interface DomainProperties {
  SubDomainSettings: List<SubDomainSetting>;
  AppId: Value<string>;
  AutoSubDomainIAMRole?: Value<string>;
  DomainName: Value<string>;
  CertificateSettings?: CertificateSettings;
  EnableAutoSubDomain?: Value<boolean>;
  AutoSubDomainCreationPatterns?: List<Value<string>>;
}
export default class Domain extends ResourceBase<DomainProperties> {
  static Certificate = Certificate;
  static CertificateSettings = CertificateSettings;
  static SubDomainSetting = SubDomainSetting;
  constructor(properties: DomainProperties) {
    super('AWS::Amplify::Domain', properties);
  }
}
