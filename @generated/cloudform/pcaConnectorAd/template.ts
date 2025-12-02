import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class ApplicationPolicies {
  Policies!: List<ApplicationPolicy>;
  Critical?: Value<boolean>;
  constructor(properties: ApplicationPolicies) {
    Object.assign(this, properties);
  }
}

export class ApplicationPolicy {
  PolicyType?: Value<string>;
  PolicyObjectIdentifier?: Value<string>;
  constructor(properties: ApplicationPolicy) {
    Object.assign(this, properties);
  }
}

export class CertificateValidity {
  ValidityPeriod!: ValidityPeriod;
  RenewalPeriod!: ValidityPeriod;
  constructor(properties: CertificateValidity) {
    Object.assign(this, properties);
  }
}

export class EnrollmentFlagsV2 {
  NoSecurityExtension?: Value<boolean>;
  IncludeSymmetricAlgorithms?: Value<boolean>;
  UserInteractionRequired?: Value<boolean>;
  EnableKeyReuseOnNtTokenKeysetStorageFull?: Value<boolean>;
  RemoveInvalidCertificateFromPersonalStore?: Value<boolean>;
  constructor(properties: EnrollmentFlagsV2) {
    Object.assign(this, properties);
  }
}

export class EnrollmentFlagsV3 {
  NoSecurityExtension?: Value<boolean>;
  IncludeSymmetricAlgorithms?: Value<boolean>;
  UserInteractionRequired?: Value<boolean>;
  EnableKeyReuseOnNtTokenKeysetStorageFull?: Value<boolean>;
  RemoveInvalidCertificateFromPersonalStore?: Value<boolean>;
  constructor(properties: EnrollmentFlagsV3) {
    Object.assign(this, properties);
  }
}

export class EnrollmentFlagsV4 {
  NoSecurityExtension?: Value<boolean>;
  IncludeSymmetricAlgorithms?: Value<boolean>;
  UserInteractionRequired?: Value<boolean>;
  EnableKeyReuseOnNtTokenKeysetStorageFull?: Value<boolean>;
  RemoveInvalidCertificateFromPersonalStore?: Value<boolean>;
  constructor(properties: EnrollmentFlagsV4) {
    Object.assign(this, properties);
  }
}

export class ExtensionsV2 {
  ApplicationPolicies?: ApplicationPolicies;
  KeyUsage!: KeyUsage;
  constructor(properties: ExtensionsV2) {
    Object.assign(this, properties);
  }
}

export class ExtensionsV3 {
  ApplicationPolicies?: ApplicationPolicies;
  KeyUsage!: KeyUsage;
  constructor(properties: ExtensionsV3) {
    Object.assign(this, properties);
  }
}

export class ExtensionsV4 {
  ApplicationPolicies?: ApplicationPolicies;
  KeyUsage!: KeyUsage;
  constructor(properties: ExtensionsV4) {
    Object.assign(this, properties);
  }
}

export class GeneralFlagsV2 {
  AutoEnrollment?: Value<boolean>;
  MachineType?: Value<boolean>;
  constructor(properties: GeneralFlagsV2) {
    Object.assign(this, properties);
  }
}

export class GeneralFlagsV3 {
  AutoEnrollment?: Value<boolean>;
  MachineType?: Value<boolean>;
  constructor(properties: GeneralFlagsV3) {
    Object.assign(this, properties);
  }
}

export class GeneralFlagsV4 {
  AutoEnrollment?: Value<boolean>;
  MachineType?: Value<boolean>;
  constructor(properties: GeneralFlagsV4) {
    Object.assign(this, properties);
  }
}

export class KeyUsage {
  Critical?: Value<boolean>;
  UsageFlags!: KeyUsageFlags;
  constructor(properties: KeyUsage) {
    Object.assign(this, properties);
  }
}

export class KeyUsageFlags {
  KeyEncipherment?: Value<boolean>;
  DataEncipherment?: Value<boolean>;
  DigitalSignature?: Value<boolean>;
  KeyAgreement?: Value<boolean>;
  NonRepudiation?: Value<boolean>;
  constructor(properties: KeyUsageFlags) {
    Object.assign(this, properties);
  }
}

export class KeyUsageProperty {
  PropertyFlags?: KeyUsagePropertyFlags;
  PropertyType?: Value<string>;
  constructor(properties: KeyUsageProperty) {
    Object.assign(this, properties);
  }
}

export class KeyUsagePropertyFlags {
  Decrypt?: Value<boolean>;
  Sign?: Value<boolean>;
  KeyAgreement?: Value<boolean>;
  constructor(properties: KeyUsagePropertyFlags) {
    Object.assign(this, properties);
  }
}

export class PrivateKeyAttributesV2 {
  MinimalKeyLength!: Value<number>;
  KeySpec!: Value<string>;
  CryptoProviders?: List<Value<string>>;
  constructor(properties: PrivateKeyAttributesV2) {
    Object.assign(this, properties);
  }
}

export class PrivateKeyAttributesV3 {
  MinimalKeyLength!: Value<number>;
  KeySpec!: Value<string>;
  KeyUsageProperty!: KeyUsageProperty;
  Algorithm!: Value<string>;
  CryptoProviders?: List<Value<string>>;
  constructor(properties: PrivateKeyAttributesV3) {
    Object.assign(this, properties);
  }
}

export class PrivateKeyAttributesV4 {
  MinimalKeyLength!: Value<number>;
  KeySpec!: Value<string>;
  KeyUsageProperty?: KeyUsageProperty;
  Algorithm?: Value<string>;
  CryptoProviders?: List<Value<string>>;
  constructor(properties: PrivateKeyAttributesV4) {
    Object.assign(this, properties);
  }
}

export class PrivateKeyFlagsV2 {
  ExportableKey?: Value<boolean>;
  StrongKeyProtectionRequired?: Value<boolean>;
  ClientVersion!: Value<string>;
  constructor(properties: PrivateKeyFlagsV2) {
    Object.assign(this, properties);
  }
}

export class PrivateKeyFlagsV3 {
  RequireAlternateSignatureAlgorithm?: Value<boolean>;
  ExportableKey?: Value<boolean>;
  StrongKeyProtectionRequired?: Value<boolean>;
  ClientVersion!: Value<string>;
  constructor(properties: PrivateKeyFlagsV3) {
    Object.assign(this, properties);
  }
}

export class PrivateKeyFlagsV4 {
  RequireAlternateSignatureAlgorithm?: Value<boolean>;
  ExportableKey?: Value<boolean>;
  UseLegacyProvider?: Value<boolean>;
  StrongKeyProtectionRequired?: Value<boolean>;
  RequireSameKeyRenewal?: Value<boolean>;
  ClientVersion!: Value<string>;
  constructor(properties: PrivateKeyFlagsV4) {
    Object.assign(this, properties);
  }
}

export class SubjectNameFlagsV2 {
  SanRequireEmail?: Value<boolean>;
  SanRequireDns?: Value<boolean>;
  RequireCommonName?: Value<boolean>;
  SanRequireUpn?: Value<boolean>;
  SanRequireDomainDns?: Value<boolean>;
  SanRequireSpn?: Value<boolean>;
  RequireEmail?: Value<boolean>;
  RequireDirectoryPath?: Value<boolean>;
  SanRequireDirectoryGuid?: Value<boolean>;
  RequireDnsAsCn?: Value<boolean>;
  constructor(properties: SubjectNameFlagsV2) {
    Object.assign(this, properties);
  }
}

export class SubjectNameFlagsV3 {
  SanRequireEmail?: Value<boolean>;
  SanRequireDns?: Value<boolean>;
  RequireCommonName?: Value<boolean>;
  SanRequireUpn?: Value<boolean>;
  SanRequireDomainDns?: Value<boolean>;
  SanRequireSpn?: Value<boolean>;
  RequireEmail?: Value<boolean>;
  RequireDirectoryPath?: Value<boolean>;
  SanRequireDirectoryGuid?: Value<boolean>;
  RequireDnsAsCn?: Value<boolean>;
  constructor(properties: SubjectNameFlagsV3) {
    Object.assign(this, properties);
  }
}

export class SubjectNameFlagsV4 {
  SanRequireEmail?: Value<boolean>;
  SanRequireDns?: Value<boolean>;
  RequireCommonName?: Value<boolean>;
  SanRequireUpn?: Value<boolean>;
  SanRequireDomainDns?: Value<boolean>;
  SanRequireSpn?: Value<boolean>;
  RequireEmail?: Value<boolean>;
  RequireDirectoryPath?: Value<boolean>;
  SanRequireDirectoryGuid?: Value<boolean>;
  RequireDnsAsCn?: Value<boolean>;
  constructor(properties: SubjectNameFlagsV4) {
    Object.assign(this, properties);
  }
}

export class TemplateDefinition {
  TemplateV4?: TemplateV4;
  TemplateV3?: TemplateV3;
  TemplateV2?: TemplateV2;
  constructor(properties: TemplateDefinition) {
    Object.assign(this, properties);
  }
}

export class TemplateV2 {
  SubjectNameFlags!: SubjectNameFlagsV2;
  SupersededTemplates?: List<Value<string>>;
  PrivateKeyFlags!: PrivateKeyFlagsV2;
  PrivateKeyAttributes!: PrivateKeyAttributesV2;
  GeneralFlags!: GeneralFlagsV2;
  CertificateValidity!: CertificateValidity;
  Extensions!: ExtensionsV2;
  EnrollmentFlags!: EnrollmentFlagsV2;
  constructor(properties: TemplateV2) {
    Object.assign(this, properties);
  }
}

export class TemplateV3 {
  SubjectNameFlags!: SubjectNameFlagsV3;
  SupersededTemplates?: List<Value<string>>;
  PrivateKeyFlags!: PrivateKeyFlagsV3;
  PrivateKeyAttributes!: PrivateKeyAttributesV3;
  GeneralFlags!: GeneralFlagsV3;
  CertificateValidity!: CertificateValidity;
  Extensions!: ExtensionsV3;
  EnrollmentFlags!: EnrollmentFlagsV3;
  HashAlgorithm!: Value<string>;
  constructor(properties: TemplateV3) {
    Object.assign(this, properties);
  }
}

export class TemplateV4 {
  SubjectNameFlags!: SubjectNameFlagsV4;
  SupersededTemplates?: List<Value<string>>;
  PrivateKeyFlags!: PrivateKeyFlagsV4;
  PrivateKeyAttributes!: PrivateKeyAttributesV4;
  GeneralFlags!: GeneralFlagsV4;
  CertificateValidity!: CertificateValidity;
  Extensions!: ExtensionsV4;
  EnrollmentFlags!: EnrollmentFlagsV4;
  HashAlgorithm?: Value<string>;
  constructor(properties: TemplateV4) {
    Object.assign(this, properties);
  }
}

export class ValidityPeriod {
  PeriodType!: Value<string>;
  Period!: Value<number>;
  constructor(properties: ValidityPeriod) {
    Object.assign(this, properties);
  }
}
export interface TemplateProperties {
  ConnectorArn: Value<string>;
  Definition: TemplateDefinition;
  Tags?: { [key: string]: Value<string> };
  Name: Value<string>;
  ReenrollAllCertificateHolders?: Value<boolean>;
}
export default class Template extends ResourceBase<TemplateProperties> {
  static ApplicationPolicies = ApplicationPolicies;
  static ApplicationPolicy = ApplicationPolicy;
  static CertificateValidity = CertificateValidity;
  static EnrollmentFlagsV2 = EnrollmentFlagsV2;
  static EnrollmentFlagsV3 = EnrollmentFlagsV3;
  static EnrollmentFlagsV4 = EnrollmentFlagsV4;
  static ExtensionsV2 = ExtensionsV2;
  static ExtensionsV3 = ExtensionsV3;
  static ExtensionsV4 = ExtensionsV4;
  static GeneralFlagsV2 = GeneralFlagsV2;
  static GeneralFlagsV3 = GeneralFlagsV3;
  static GeneralFlagsV4 = GeneralFlagsV4;
  static KeyUsage = KeyUsage;
  static KeyUsageFlags = KeyUsageFlags;
  static KeyUsageProperty = KeyUsageProperty;
  static KeyUsagePropertyFlags = KeyUsagePropertyFlags;
  static PrivateKeyAttributesV2 = PrivateKeyAttributesV2;
  static PrivateKeyAttributesV3 = PrivateKeyAttributesV3;
  static PrivateKeyAttributesV4 = PrivateKeyAttributesV4;
  static PrivateKeyFlagsV2 = PrivateKeyFlagsV2;
  static PrivateKeyFlagsV3 = PrivateKeyFlagsV3;
  static PrivateKeyFlagsV4 = PrivateKeyFlagsV4;
  static SubjectNameFlagsV2 = SubjectNameFlagsV2;
  static SubjectNameFlagsV3 = SubjectNameFlagsV3;
  static SubjectNameFlagsV4 = SubjectNameFlagsV4;
  static TemplateDefinition = TemplateDefinition;
  static TemplateV2 = TemplateV2;
  static TemplateV3 = TemplateV3;
  static TemplateV4 = TemplateV4;
  static ValidityPeriod = ValidityPeriod;
  constructor(properties: TemplateProperties) {
    super('AWS::PCAConnectorAD::Template', properties);
  }
}
