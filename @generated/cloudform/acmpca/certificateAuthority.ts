import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AccessDescription {
  AccessMethod!: AccessMethod;
  AccessLocation!: GeneralName;
  constructor(properties: AccessDescription) {
    Object.assign(this, properties);
  }
}

export class AccessMethod {
  CustomObjectIdentifier?: Value<string>;
  AccessMethodType?: Value<string>;
  constructor(properties: AccessMethod) {
    Object.assign(this, properties);
  }
}

export class CrlConfiguration {
  CrlDistributionPointExtensionConfiguration?: CrlDistributionPointExtensionConfiguration;
  CustomCname?: Value<string>;
  S3ObjectAcl?: Value<string>;
  CrlType?: Value<string>;
  ExpirationInDays?: Value<number>;
  Enabled!: Value<boolean>;
  S3BucketName?: Value<string>;
  CustomPath?: Value<string>;
  constructor(properties: CrlConfiguration) {
    Object.assign(this, properties);
  }
}

export class CrlDistributionPointExtensionConfiguration {
  OmitExtension!: Value<boolean>;
  constructor(properties: CrlDistributionPointExtensionConfiguration) {
    Object.assign(this, properties);
  }
}

export class CsrExtensions {
  KeyUsage?: KeyUsage;
  SubjectInformationAccess?: List<AccessDescription>;
  constructor(properties: CsrExtensions) {
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

export class EdiPartyName {
  PartyName!: Value<string>;
  NameAssigner?: Value<string>;
  constructor(properties: EdiPartyName) {
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

export class OcspConfiguration {
  OcspCustomCname?: Value<string>;
  Enabled!: Value<boolean>;
  constructor(properties: OcspConfiguration) {
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

export class RevocationConfiguration {
  OcspConfiguration?: OcspConfiguration;
  CrlConfiguration?: CrlConfiguration;
  constructor(properties: RevocationConfiguration) {
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
export interface CertificateAuthorityProperties {
  CsrExtensions?: CsrExtensions;
  Type: Value<string>;
  RevocationConfiguration?: RevocationConfiguration;
  UsageMode?: Value<string>;
  SigningAlgorithm: Value<string>;
  KeyStorageSecurityStandard?: Value<string>;
  Subject: Subject;
  Tags?: List<ResourceTag>;
  KeyAlgorithm: Value<string>;
}
export default class CertificateAuthority extends ResourceBase<CertificateAuthorityProperties> {
  static AccessDescription = AccessDescription;
  static AccessMethod = AccessMethod;
  static CrlConfiguration = CrlConfiguration;
  static CrlDistributionPointExtensionConfiguration = CrlDistributionPointExtensionConfiguration;
  static CsrExtensions = CsrExtensions;
  static CustomAttribute = CustomAttribute;
  static EdiPartyName = EdiPartyName;
  static GeneralName = GeneralName;
  static KeyUsage = KeyUsage;
  static OcspConfiguration = OcspConfiguration;
  static OtherName = OtherName;
  static RevocationConfiguration = RevocationConfiguration;
  static Subject = Subject;
  constructor(properties: CertificateAuthorityProperties) {
    super('AWS::ACMPCA::CertificateAuthority', properties);
  }
}
