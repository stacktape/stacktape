import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class AuditCheckConfiguration {
  Enabled?: Value<boolean>;
  constructor(properties: AuditCheckConfiguration) {
    Object.assign(this, properties);
  }
}

export class AuditCheckConfigurations {
  IotRoleAliasOverlyPermissiveCheck?: AuditCheckConfiguration;
  DeviceCertificateSharedCheck?: AuditCheckConfiguration;
  ConflictingClientIdsCheck?: AuditCheckConfiguration;
  IntermediateCaRevokedForActiveDeviceCertificatesCheck?: AuditCheckConfiguration;
  IotRoleAliasAllowsAccessToUnusedServicesCheck?: AuditCheckConfiguration;
  RevokedCaCertificateStillActiveCheck?: AuditCheckConfiguration;
  LoggingDisabledCheck?: AuditCheckConfiguration;
  UnauthenticatedCognitoRoleOverlyPermissiveCheck?: AuditCheckConfiguration;
  AuthenticatedCognitoRoleOverlyPermissiveCheck?: AuditCheckConfiguration;
  CaCertificateExpiringCheck?: AuditCheckConfiguration;
  DeviceCertificateExpiringCheck?: DeviceCertExpirationAuditCheckConfiguration;
  IoTPolicyPotentialMisConfigurationCheck?: AuditCheckConfiguration;
  DeviceCertificateAgeCheck?: DeviceCertAgeAuditCheckConfiguration;
  IotPolicyOverlyPermissiveCheck?: AuditCheckConfiguration;
  RevokedDeviceCertificateStillActiveCheck?: AuditCheckConfiguration;
  DeviceCertificateKeyQualityCheck?: AuditCheckConfiguration;
  CaCertificateKeyQualityCheck?: AuditCheckConfiguration;
  constructor(properties: AuditCheckConfigurations) {
    Object.assign(this, properties);
  }
}

export class AuditNotificationTarget {
  TargetArn?: Value<string>;
  Enabled?: Value<boolean>;
  RoleArn?: Value<string>;
  constructor(properties: AuditNotificationTarget) {
    Object.assign(this, properties);
  }
}

export class AuditNotificationTargetConfigurations {
  Sns?: AuditNotificationTarget;
  constructor(properties: AuditNotificationTargetConfigurations) {
    Object.assign(this, properties);
  }
}

export class CertAgeCheckCustomConfiguration {
  CertAgeThresholdInDays?: Value<string>;
  constructor(properties: CertAgeCheckCustomConfiguration) {
    Object.assign(this, properties);
  }
}

export class CertExpirationCheckCustomConfiguration {
  CertExpirationThresholdInDays?: Value<string>;
  constructor(properties: CertExpirationCheckCustomConfiguration) {
    Object.assign(this, properties);
  }
}

export class DeviceCertAgeAuditCheckConfiguration {
  Configuration?: CertAgeCheckCustomConfiguration;
  Enabled?: Value<boolean>;
  constructor(properties: DeviceCertAgeAuditCheckConfiguration) {
    Object.assign(this, properties);
  }
}

export class DeviceCertExpirationAuditCheckConfiguration {
  Configuration?: CertExpirationCheckCustomConfiguration;
  Enabled?: Value<boolean>;
  constructor(properties: DeviceCertExpirationAuditCheckConfiguration) {
    Object.assign(this, properties);
  }
}
export interface AccountAuditConfigurationProperties {
  AccountId: Value<string>;
  AuditCheckConfigurations: AuditCheckConfigurations;
  AuditNotificationTargetConfigurations?: AuditNotificationTargetConfigurations;
  RoleArn: Value<string>;
}
export default class AccountAuditConfiguration extends ResourceBase<AccountAuditConfigurationProperties> {
  static AuditCheckConfiguration = AuditCheckConfiguration;
  static AuditCheckConfigurations = AuditCheckConfigurations;
  static AuditNotificationTarget = AuditNotificationTarget;
  static AuditNotificationTargetConfigurations = AuditNotificationTargetConfigurations;
  static CertAgeCheckCustomConfiguration = CertAgeCheckCustomConfiguration;
  static CertExpirationCheckCustomConfiguration = CertExpirationCheckCustomConfiguration;
  static DeviceCertAgeAuditCheckConfiguration = DeviceCertAgeAuditCheckConfiguration;
  static DeviceCertExpirationAuditCheckConfiguration = DeviceCertExpirationAuditCheckConfiguration;
  constructor(properties: AccountAuditConfigurationProperties) {
    super('AWS::IoT::AccountAuditConfiguration', properties);
  }
}
