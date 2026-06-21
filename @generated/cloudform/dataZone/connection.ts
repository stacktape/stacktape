import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class AmazonQPropertiesInput {
  IsEnabled?: Value<boolean>;
  ProfileArn?: Value<string>;
  AuthMode?: Value<string>;
  constructor(properties: AmazonQPropertiesInput) {
    Object.assign(this, properties);
  }
}

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

export class ConnectionConfiguration {
  Classification?: Value<string>;
  Properties?: { [key: string]: Value<string> };
  constructor(properties: ConnectionConfiguration) {
    Object.assign(this, properties);
  }
}

export class ConnectionPropertiesInput {
  WorkflowsServerlessProperties?: { [key: string]: any };
  IamProperties?: IamPropertiesInput;
  HyperPodProperties?: HyperPodPropertiesInput;
  SparkGlueProperties?: SparkGluePropertiesInput;
  MlflowProperties?: MlflowPropertiesInput;
  AthenaProperties?: AthenaPropertiesInput;
  RedshiftProperties?: RedshiftPropertiesInput;
  WorkflowsMwaaProperties?: WorkflowsMwaaPropertiesInput;
  AmazonQProperties?: AmazonQPropertiesInput;
  S3Properties?: S3PropertiesInput;
  SparkEmrProperties?: SparkEmrPropertiesInput;
  LakehouseProperties?: LakehousePropertiesInput;
  GlueProperties?: GluePropertiesInput;
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

export class LakehousePropertiesInput {
  GlueLineageSyncEnabled?: Value<boolean>;
  constructor(properties: LakehousePropertiesInput) {
    Object.assign(this, properties);
  }
}

export class LineageSyncSchedule {
  Schedule?: Value<string>;
  constructor(properties: LineageSyncSchedule) {
    Object.assign(this, properties);
  }
}

export class MlflowPropertiesInput {
  TrackingServerArn?: Value<string>;
  constructor(properties: MlflowPropertiesInput) {
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
  RegisterS3AccessGrantLocation?: Value<boolean>;
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
  ManagedEndpointArn?: Value<string>;
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

export class WorkflowsMwaaPropertiesInput {
  MwaaEnvironmentName?: Value<string>;
  constructor(properties: WorkflowsMwaaPropertiesInput) {
    Object.assign(this, properties);
  }
}
export interface ConnectionProperties {
  ProjectIdentifier?: Value<string>;
  Description?: Value<string>;
  EnvironmentIdentifier?: Value<string>;
  Scope?: Value<string>;
  Props?: ConnectionPropertiesInput;
  Configurations?: List<ConnectionConfiguration>;
  AwsLocation?: AwsLocation;
  EnableTrustedIdentityPropagation?: Value<boolean>;
  Name: Value<string>;
  DomainIdentifier: Value<string>;
}
export default class Connection extends ResourceBase<ConnectionProperties> {
  static AmazonQPropertiesInput = AmazonQPropertiesInput;
  static AthenaPropertiesInput = AthenaPropertiesInput;
  static AuthenticationConfigurationInput = AuthenticationConfigurationInput;
  static AuthorizationCodeProperties = AuthorizationCodeProperties;
  static AwsLocation = AwsLocation;
  static BasicAuthenticationCredentials = BasicAuthenticationCredentials;
  static ConnectionConfiguration = ConnectionConfiguration;
  static ConnectionPropertiesInput = ConnectionPropertiesInput;
  static GlueConnectionInput = GlueConnectionInput;
  static GlueOAuth2Credentials = GlueOAuth2Credentials;
  static GluePropertiesInput = GluePropertiesInput;
  static HyperPodPropertiesInput = HyperPodPropertiesInput;
  static IamPropertiesInput = IamPropertiesInput;
  static LakehousePropertiesInput = LakehousePropertiesInput;
  static LineageSyncSchedule = LineageSyncSchedule;
  static MlflowPropertiesInput = MlflowPropertiesInput;
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
  static WorkflowsMwaaPropertiesInput = WorkflowsMwaaPropertiesInput;
  constructor(properties: ConnectionProperties) {
    super('AWS::DataZone::Connection', properties);
  }
}
