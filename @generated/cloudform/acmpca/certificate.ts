import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class ApiPassthrough {
  Extensions?: Extensions;
  Subject?: Subject;
  constructor(properties: ApiPassthrough) {
    Object.assign(this, properties);
  }
}

export class CustomAttribute {
  Value!: Value<string>;
  ObjectIdentifier!: Value<string>;
  constructor(properties: CustomAttribute) {
    Object.assign(this, properties);
  }
}

export class CustomExtension {
  Value!: Value<string>;
  Critical?: Value<boolean>;
  ObjectIdentifier!: Value<string>;
  constructor(properties: CustomExtension) {
    Object.assign(this, properties);
  }
}

export class EdiPartyName {
  PartyName!: Value<string>;
  NameAssigner!: Value<string>;
  constructor(properties: EdiPartyName) {
    Object.assign(this, properties);
  }
}

export class ExtendedKeyUsage {
  ExtendedKeyUsageType?: Value<string>;
  ExtendedKeyUsageObjectIdentifier?: Value<string>;
  constructor(properties: ExtendedKeyUsage) {
    Object.assign(this, properties);
  }
}

export class Extensions {
  CustomExtensions?: List<CustomExtension>;
  CertificatePolicies?: List<PolicyInformation>;
  KeyUsage?: KeyUsage;
  SubjectAlternativeNames?: List<GeneralName>;
  ExtendedKeyUsage?: List<ExtendedKeyUsage>;
  constructor(properties: Extensions) {
    Object.assign(this, properties);
  }
}

export class GeneralName {
  UniformResourceIdentifier?: Value<string>;
  DnsName?: Value<string>;
  EdiPartyName?: EdiPartyName;
  RegisteredId?: Value<string>;
  Rfc822Name?: Value<string>;
  OtherName?: OtherName;
  IpAddress?: Value<string>;
  DirectoryName?: Subject;
  constructor(properties: GeneralName) {
    Object.assign(this, properties);
  }
}

export class KeyUsage {
  KeyEncipherment?: Value<boolean>;
  DataEncipherment?: Value<boolean>;
  DigitalSignature?: Value<boolean>;
  KeyCertSign?: Value<boolean>;
  DecipherOnly?: Value<boolean>;
  KeyAgreement?: Value<boolean>;
  NonRepudiation?: Value<boolean>;
  CRLSign?: Value<boolean>;
  EncipherOnly?: Value<boolean>;
  constructor(properties: KeyUsage) {
    Object.assign(this, properties);
  }
}

export class OtherName {
  TypeId!: Value<string>;
  Value!: Value<string>;
  constructor(properties: OtherName) {
    Object.assign(this, properties);
  }
}

export class PolicyInformation {
  CertPolicyId!: Value<string>;
  PolicyQualifiers?: List<PolicyQualifierInfo>;
  constructor(properties: PolicyInformation) {
    Object.assign(this, properties);
  }
}

export class PolicyQualifierInfo {
  Qualifier!: Qualifier;
  PolicyQualifierId!: Value<string>;
  constructor(properties: PolicyQualifierInfo) {
    Object.assign(this, properties);
  }
}

export class Qualifier {
  CpsUri!: Value<string>;
  constructor(properties: Qualifier) {
    Object.assign(this, properties);
  }
}

export class Subject {
  Organization?: Value<string>;
  OrganizationalUnit?: Value<string>;
  Locality?: Value<string>;
  Title?: Value<string>;
  GivenName?: Value<string>;
  GenerationQualifier?: Value<string>;
  Initials?: Value<string>;
  CustomAttributes?: List<CustomAttribute>;
  SerialNumber?: Value<string>;
  State?: Value<string>;
  Country?: Value<string>;
  Surname?: Value<string>;
  DistinguishedNameQualifier?: Value<string>;
  CommonName?: Value<string>;
  Pseudonym?: Value<string>;
  constructor(properties: Subject) {
    Object.assign(this, properties);
  }
}

export class Validity {
  Type!: Value<string>;
  Value!: Value<number>;
  constructor(properties: Validity) {
    Object.assign(this, properties);
  }
}
export interface CertificateProperties {
  TemplateArn?: Value<string>;
  CertificateAuthorityArn: Value<string>;
  Validity: Validity;
  CertificateSigningRequest: Value<string>;
  SigningAlgorithm: Value<string>;
  ApiPassthrough?: ApiPassthrough;
  ValidityNotBefore?: Validity;
}
export default class Certificate extends ResourceBase<CertificateProperties> {
  static ApiPassthrough = ApiPassthrough;
  static CustomAttribute = CustomAttribute;
  static CustomExtension = CustomExtension;
  static EdiPartyName = EdiPartyName;
  static ExtendedKeyUsage = ExtendedKeyUsage;
  static Extensions = Extensions;
  static GeneralName = GeneralName;
  static KeyUsage = KeyUsage;
  static OtherName = OtherName;
  static PolicyInformation = PolicyInformation;
  static PolicyQualifierInfo = PolicyQualifierInfo;
  static Qualifier = Qualifier;
  static Subject = Subject;
  static Validity = Validity;
  constructor(properties: CertificateProperties) {
    super('AWS::ACMPCA::Certificate', properties);
  }
}
