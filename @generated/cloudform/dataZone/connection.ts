import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class AthenaPropertiesInput {
  WorkgroupName!: Value<string>;
  constructor(properties: AthenaPropertiesInput) {
    Object.assign(this, properties);
  }
}

export class AuthenticationConfigurationInput {
  SecretArn?: Value<string>;
  KmsKeyArn?: Value<string>;
  OAuth2Properties?: OAuth2Properties;
  CustomAuthenticationCredentials?: { [key: string]: Value<string> };
  BasicAuthenticationCredentials?: BasicAuthenticationCredentials;
  AuthenticationType?: Value<string>;
  constructor(properties: AuthenticationConfigurationInput) {
    Object.assign(this, properties);
  }
}

export class AuthorizationCodeProperties {
  AuthorizationCode?: Value<string>;
  RedirectUri?: Value<string>;
  constructor(properties: AuthorizationCodeProperties) {
    Object.assign(this, properties);
  }
}

export class AwsLocation {
  AwsRegion?: Value<string>;
  AccessRole?: Value<string>;
  AwsAccountId?: Value<string>;
  IamConnectionId?: Value<string>;
  constructor(properties: AwsLocation) {
    Object.assign(this, properties);
  }
}

export class BasicAuthenticationCredentials {
  UserName?: Value<string>;
  Password?: Value<string>;
  constructor(properties: BasicAuthenticationCredentials) {
    Object.assign(this, properties);
  }
}

export class ConnectionPropertiesInput {
  IamProperties?: IamPropertiesInput;
  S3Properties?: S3PropertiesInput;
  SparkEmrProperties?: SparkEmrPropertiesInput;
  HyperPodProperties?: HyperPodPropertiesInput;
  SparkGlueProperties?: SparkGluePropertiesInput;
  AthenaProperties?: AthenaPropertiesInput;
  GlueProperties?: GluePropertiesInput;
  RedshiftProperties?: RedshiftPropertiesInput;
  constructor(properties: ConnectionPropertiesInput) {
    Object.assign(this, properties);
  }
}

export class GlueConnectionInput {
  PythonProperties?: { [key: string]: Value<string> };
  AuthenticationConfiguration?: AuthenticationConfigurationInput;
  SparkProperties?: { [key: string]: Value<string> };
  Description?: Value<string>;
  ConnectionType?: Value<string>;
  MatchCriteria?: Value<string>;
  PhysicalConnectionRequirements?: PhysicalConnectionRequirements;
  ConnectionProperties?: { [key: string]: Value<string> };
  AthenaProperties?: { [key: string]: Value<string> };
  ValidateForComputeEnvironments?: List<Value<string>>;
  ValidateCredentials?: Value<boolean>;
  Name?: Value<string>;
  constructor(properties: GlueConnectionInput) {
    Object.assign(this, properties);
  }
}

export class GlueOAuth2Credentials {
  UserManagedClientApplicationClientSecret?: Value<string>;
  JwtToken?: Value<string>;
  RefreshToken?: Value<string>;
  AccessToken?: Value<string>;
  constructor(properties: GlueOAuth2Credentials) {
    Object.assign(this, properties);
  }
}

export class GluePropertiesInput {
  GlueConnectionInput?: GlueConnectionInput;
  constructor(properties: GluePropertiesInput) {
    Object.assign(this, properties);
  }
}

export class HyperPodPropertiesInput {
  ClusterName!: Value<string>;
  constructor(properties: HyperPodPropertiesInput) {
    Object.assign(this, properties);
  }
}

export class IamPropertiesInput {
  GlueLineageSyncEnabled?: Value<boolean>;
  constructor(properties: IamPropertiesInput) {
    Object.assign(this, properties);
  }
}

export class LineageSyncSchedule {
  Schedule?: Value<string>;
  constructor(properties: LineageSyncSchedule) {
    Object.assign(this, properties);
  }
}

export class OAuth2ClientApplication {
  AWSManagedClientApplicationReference?: Value<string>;
  UserManagedClientApplicationClientId?: Value<string>;
  constructor(properties: OAuth2ClientApplication) {
    Object.assign(this, properties);
  }
}

export class OAuth2Properties {
  AuthorizationCodeProperties?: AuthorizationCodeProperties;
  OAuth2ClientApplication?: OAuth2ClientApplication;
  TokenUrl?: Value<string>;
  OAuth2Credentials?: GlueOAuth2Credentials;
  OAuth2GrantType?: Value<string>;
  TokenUrlParametersMap?: { [key: string]: Value<string> };
  constructor(properties: OAuth2Properties) {
    Object.assign(this, properties);
  }
}

export class PhysicalConnectionRequirements {
  SubnetIdList?: List<Value<string>>;
  AvailabilityZone?: Value<string>;
  SecurityGroupIdList?: List<Value<string>>;
  SubnetId?: Value<string>;
  constructor(properties: PhysicalConnectionRequirements) {
    Object.assign(this, properties);
  }
}

export class RedshiftCredentials {
  SecretArn?: Value<string>;
  UsernamePassword?: UsernamePassword;
  constructor(properties: RedshiftCredentials) {
    Object.assign(this, properties);
  }
}

export class RedshiftLineageSyncConfigurationInput {
  Schedule?: LineageSyncSchedule;
  Enabled?: Value<boolean>;
  constructor(properties: RedshiftLineageSyncConfigurationInput) {
    Object.assign(this, properties);
  }
}

export class RedshiftPropertiesInput {
  Storage?: RedshiftStorageProperties;
  Port?: Value<number>;
  DatabaseName?: Value<string>;
  Host?: Value<string>;
  Credentials?: RedshiftCredentials;
  LineageSync?: RedshiftLineageSyncConfigurationInput;
  constructor(properties: RedshiftPropertiesInput) {
    Object.assign(this, properties);
  }
}

export class RedshiftStorageProperties {
  ClusterName?: Value<string>;
  WorkgroupName?: Value<string>;
  constructor(properties: RedshiftStorageProperties) {
    Object.assign(this, properties);
  }
}

export class S3PropertiesInput {
  S3Uri!: Value<string>;
  S3AccessGrantLocationId?: Value<string>;
  constructor(properties: S3PropertiesInput) {
    Object.assign(this, properties);
  }
}

export class SparkEmrPropertiesInput {
  ComputeArn?: Value<string>;
  TrustedCertificatesS3Uri?: Value<string>;
  LogUri?: Value<string>;
  JavaVirtualEnv?: Value<string>;
  PythonVirtualEnv?: Value<string>;
  RuntimeRole?: Value<string>;
  InstanceProfileArn?: Value<string>;
  constructor(properties: SparkEmrPropertiesInput) {
    Object.assign(this, properties);
  }
}

export class SparkGlueArgs {
  Connection?: Value<string>;
  constructor(properties: SparkGlueArgs) {
    Object.assign(this, properties);
  }
}

export class SparkGluePropertiesInput {
  WorkerType?: Value<string>;
  AdditionalArgs?: SparkGlueArgs;
  JavaVirtualEnv?: Value<string>;
  GlueVersion?: Value<string>;
  PythonVirtualEnv?: Value<string>;
  IdleTimeout?: Value<number>;
  GlueConnectionName?: Value<string>;
  NumberOfWorkers?: Value<number>;
  constructor(properties: SparkGluePropertiesInput) {
    Object.assign(this, properties);
  }
}

export class UsernamePassword {
  Username!: Value<string>;
  Password!: Value<string>;
  constructor(properties: UsernamePassword) {
    Object.assign(this, properties);
  }
}
export interface ConnectionProperties {
  ProjectIdentifier?: Value<string>;
  Description?: Value<string>;
  EnvironmentIdentifier?: Value<string>;
  Props?: ConnectionPropertiesInput;
  AwsLocation?: AwsLocation;
  EnableTrustedIdentityPropagation?: Value<boolean>;
  Name: Value<string>;
  DomainIdentifier: Value<string>;
}
export default class Connection extends ResourceBase<ConnectionProperties> {
  static AthenaPropertiesInput = AthenaPropertiesInput;
  static AuthenticationConfigurationInput = AuthenticationConfigurationInput;
  static AuthorizationCodeProperties = AuthorizationCodeProperties;
  static AwsLocation = AwsLocation;
  static BasicAuthenticationCredentials = BasicAuthenticationCredentials;
  static ConnectionPropertiesInput = ConnectionPropertiesInput;
  static GlueConnectionInput = GlueConnectionInput;
  static GlueOAuth2Credentials = GlueOAuth2Credentials;
  static GluePropertiesInput = GluePropertiesInput;
  static HyperPodPropertiesInput = HyperPodPropertiesInput;
  static IamPropertiesInput = IamPropertiesInput;
  static LineageSyncSchedule = LineageSyncSchedule;
  static OAuth2ClientApplication = OAuth2ClientApplication;
  static OAuth2Properties = OAuth2Properties;
  static PhysicalConnectionRequirements = PhysicalConnectionRequirements;
  static RedshiftCredentials = RedshiftCredentials;
  static RedshiftLineageSyncConfigurationInput = RedshiftLineageSyncConfigurationInput;
  static RedshiftPropertiesInput = RedshiftPropertiesInput;
  static RedshiftStorageProperties = RedshiftStorageProperties;
  static S3PropertiesInput = S3PropertiesInput;
  static SparkEmrPropertiesInput = SparkEmrPropertiesInput;
  static SparkGlueArgs = SparkGlueArgs;
  static SparkGluePropertiesInput = SparkGluePropertiesInput;
  static UsernamePassword = UsernamePassword;
  constructor(properties: ConnectionProperties) {
    super('AWS::DataZone::Connection', properties);
  }
}
