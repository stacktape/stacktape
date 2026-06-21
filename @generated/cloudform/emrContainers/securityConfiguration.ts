import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AtRestEncryptionConfiguration {
  LocalDiskEncryptionConfiguration?: LocalDiskEncryptionConfiguration;
  S3EncryptionConfiguration?: S3EncryptionConfiguration;
  constructor(properties: AtRestEncryptionConfiguration) {
    Object.assign(this, properties);
  }
}

export class AuthenticationConfiguration {
  IAMConfiguration?: IAMConfiguration;
  IdentityCenterConfiguration?: IdentityCenterConfiguration;
  constructor(properties: AuthenticationConfiguration) {
    Object.assign(this, properties);
  }
}

export class AuthorizationConfiguration {
  LakeFormationConfiguration?: LakeFormationConfiguration;
  constructor(properties: AuthorizationConfiguration) {
    Object.assign(this, properties);
  }
}

export class ContainerInfo {
  EksInfo?: EksInfo;
  constructor(properties: ContainerInfo) {
    Object.assign(this, properties);
  }
}

export class ContainerProvider {
  Type!: Value<string>;
  Id!: Value<string>;
  Info?: ContainerInfo;
  constructor(properties: ContainerProvider) {
    Object.assign(this, properties);
  }
}

export class EksInfo {
  Namespace?: Value<string>;
  constructor(properties: EksInfo) {
    Object.assign(this, properties);
  }
}

export class EncryptionConfiguration {
  InTransitEncryptionConfiguration?: InTransitEncryptionConfiguration;
  AtRestEncryptionConfiguration?: AtRestEncryptionConfiguration;
  constructor(properties: EncryptionConfiguration) {
    Object.assign(this, properties);
  }
}

export class IAMConfiguration {
  SystemRole?: Value<string>;
  constructor(properties: IAMConfiguration) {
    Object.assign(this, properties);
  }
}

export class IdentityCenterConfiguration {
  IdentityCenterInstanceARN?: Value<string>;
  IdentityCenterApplicationAssignmentRequired?: Value<boolean>;
  EnableIdentityCenter?: Value<boolean>;
  constructor(properties: IdentityCenterConfiguration) {
    Object.assign(this, properties);
  }
}

export class InTransitEncryptionConfiguration {
  TLSCertificateConfiguration?: TLSCertificateConfiguration;
  constructor(properties: InTransitEncryptionConfiguration) {
    Object.assign(this, properties);
  }
}

export class LakeFormationConfiguration {
  SecureNamespaceInfo?: SecureNamespaceInfo;
  QueryAccessControlEnabled?: Value<boolean>;
  AuthorizedSessionTagValue?: Value<string>;
  QueryEngineRoleArn?: Value<string>;
  constructor(properties: LakeFormationConfiguration) {
    Object.assign(this, properties);
  }
}

export class LocalDiskEncryptionConfiguration {
  AwsKmsKeyId?: Value<string>;
  EncryptionKeyProviderType?: Value<string>;
  constructor(properties: LocalDiskEncryptionConfiguration) {
    Object.assign(this, properties);
  }
}

export class S3EncryptionConfiguration {
  KMSKeyId?: Value<string>;
  EncryptionOption?: Value<string>;
  constructor(properties: S3EncryptionConfiguration) {
    Object.assign(this, properties);
  }
}

export class SecureNamespaceInfo {
  ClusterId?: Value<string>;
  Namespace?: Value<string>;
  constructor(properties: SecureNamespaceInfo) {
    Object.assign(this, properties);
  }
}

export class SecurityConfigurationData {
  AuthenticationConfiguration?: AuthenticationConfiguration;
  AuthorizationConfiguration?: AuthorizationConfiguration;
  EncryptionConfiguration?: EncryptionConfiguration;
  constructor(properties: SecurityConfigurationData) {
    Object.assign(this, properties);
  }
}

export class TLSCertificateConfiguration {
  PublicKeySecretArn?: Value<string>;
  PrivateKeySecretArn?: Value<string>;
  CertificateProviderType?: Value<string>;
  constructor(properties: TLSCertificateConfiguration) {
    Object.assign(this, properties);
  }
}
export interface SecurityConfigurationProperties {
  ContainerProvider?: ContainerProvider;
  SecurityConfigurationData: SecurityConfigurationData;
  Tags?: List<ResourceTag>;
  Name?: Value<string>;
}
export default class SecurityConfiguration extends ResourceBase<SecurityConfigurationProperties> {
  static AtRestEncryptionConfiguration = AtRestEncryptionConfiguration;
  static AuthenticationConfiguration = AuthenticationConfiguration;
  static AuthorizationConfiguration = AuthorizationConfiguration;
  static ContainerInfo = ContainerInfo;
  static ContainerProvider = ContainerProvider;
  static EksInfo = EksInfo;
  static EncryptionConfiguration = EncryptionConfiguration;
  static IAMConfiguration = IAMConfiguration;
  static IdentityCenterConfiguration = IdentityCenterConfiguration;
  static InTransitEncryptionConfiguration = InTransitEncryptionConfiguration;
  static LakeFormationConfiguration = LakeFormationConfiguration;
  static LocalDiskEncryptionConfiguration = LocalDiskEncryptionConfiguration;
  static S3EncryptionConfiguration = S3EncryptionConfiguration;
  static SecureNamespaceInfo = SecureNamespaceInfo;
  static SecurityConfigurationData = SecurityConfigurationData;
  static TLSCertificateConfiguration = TLSCertificateConfiguration;
  constructor(properties: SecurityConfigurationProperties) {
    super('AWS::EMRContainers::SecurityConfiguration', properties);
  }
}
