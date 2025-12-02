import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AmazonElasticsearchParameters {
  Domain!: Value<string>;
  constructor(properties: AmazonElasticsearchParameters) {
    Object.assign(this, properties);
  }
}

export class AmazonOpenSearchParameters {
  Domain!: Value<string>;
  constructor(properties: AmazonOpenSearchParameters) {
    Object.assign(this, properties);
  }
}

export class AthenaParameters {
  WorkGroup?: Value<string>;
  IdentityCenterConfiguration?: IdentityCenterConfiguration;
  RoleArn?: Value<string>;
  constructor(properties: AthenaParameters) {
    Object.assign(this, properties);
  }
}

export class AuroraParameters {
  Port!: Value<number>;
  Database!: Value<string>;
  Host!: Value<string>;
  constructor(properties: AuroraParameters) {
    Object.assign(this, properties);
  }
}

export class AuroraPostgreSqlParameters {
  Port!: Value<number>;
  Database!: Value<string>;
  Host!: Value<string>;
  constructor(properties: AuroraPostgreSqlParameters) {
    Object.assign(this, properties);
  }
}

export class CredentialPair {
  AlternateDataSourceParameters?: List<DataSourceParameters>;
  Username!: Value<string>;
  Password!: Value<string>;
  constructor(properties: CredentialPair) {
    Object.assign(this, properties);
  }
}

export class DataSourceCredentials {
  SecretArn?: Value<string>;
  CopySourceArn?: Value<string>;
  CredentialPair?: CredentialPair;
  constructor(properties: DataSourceCredentials) {
    Object.assign(this, properties);
  }
}

export class DataSourceErrorInfo {
  Type?: Value<string>;
  Message?: Value<string>;
  constructor(properties: DataSourceErrorInfo) {
    Object.assign(this, properties);
  }
}

export class DataSourceParameters {
  AuroraPostgreSqlParameters?: AuroraPostgreSqlParameters;
  TeradataParameters?: TeradataParameters;
  RdsParameters?: RdsParameters;
  AthenaParameters?: AthenaParameters;
  SparkParameters?: SparkParameters;
  MariaDbParameters?: MariaDbParameters;
  OracleParameters?: OracleParameters;
  PrestoParameters?: PrestoParameters;
  StarburstParameters?: StarburstParameters;
  RedshiftParameters?: RedshiftParameters;
  MySqlParameters?: MySqlParameters;
  SqlServerParameters?: SqlServerParameters;
  SnowflakeParameters?: SnowflakeParameters;
  AmazonElasticsearchParameters?: AmazonElasticsearchParameters;
  AmazonOpenSearchParameters?: AmazonOpenSearchParameters;
  PostgreSqlParameters?: PostgreSqlParameters;
  AuroraParameters?: AuroraParameters;
  S3Parameters?: S3Parameters;
  TrinoParameters?: TrinoParameters;
  DatabricksParameters?: DatabricksParameters;
  constructor(properties: DataSourceParameters) {
    Object.assign(this, properties);
  }
}

export class DatabricksParameters {
  Port!: Value<number>;
  Host!: Value<string>;
  SqlEndpointPath!: Value<string>;
  constructor(properties: DatabricksParameters) {
    Object.assign(this, properties);
  }
}

export class IdentityCenterConfiguration {
  EnableIdentityPropagation?: Value<boolean>;
  constructor(properties: IdentityCenterConfiguration) {
    Object.assign(this, properties);
  }
}

export class ManifestFileLocation {
  Bucket!: Value<string>;
  Key!: Value<string>;
  constructor(properties: ManifestFileLocation) {
    Object.assign(this, properties);
  }
}

export class MariaDbParameters {
  Port!: Value<number>;
  Database!: Value<string>;
  Host!: Value<string>;
  constructor(properties: MariaDbParameters) {
    Object.assign(this, properties);
  }
}

export class MySqlParameters {
  Port!: Value<number>;
  Database!: Value<string>;
  Host!: Value<string>;
  constructor(properties: MySqlParameters) {
    Object.assign(this, properties);
  }
}

export class OAuthParameters {
  TokenProviderUrl!: Value<string>;
  OAuthScope?: Value<string>;
  IdentityProviderVpcConnectionProperties?: VpcConnectionProperties;
  IdentityProviderResourceUri?: Value<string>;
  constructor(properties: OAuthParameters) {
    Object.assign(this, properties);
  }
}

export class OracleParameters {
  UseServiceName?: Value<boolean>;
  Port!: Value<number>;
  Database!: Value<string>;
  Host!: Value<string>;
  constructor(properties: OracleParameters) {
    Object.assign(this, properties);
  }
}

export class PostgreSqlParameters {
  Port!: Value<number>;
  Database!: Value<string>;
  Host!: Value<string>;
  constructor(properties: PostgreSqlParameters) {
    Object.assign(this, properties);
  }
}

export class PrestoParameters {
  Port!: Value<number>;
  Host!: Value<string>;
  Catalog!: Value<string>;
  constructor(properties: PrestoParameters) {
    Object.assign(this, properties);
  }
}

export class RdsParameters {
  InstanceId!: Value<string>;
  Database!: Value<string>;
  constructor(properties: RdsParameters) {
    Object.assign(this, properties);
  }
}

export class RedshiftIAMParameters {
  AutoCreateDatabaseUser?: Value<boolean>;
  DatabaseUser?: Value<string>;
  RoleArn!: Value<string>;
  DatabaseGroups?: List<Value<string>>;
  constructor(properties: RedshiftIAMParameters) {
    Object.assign(this, properties);
  }
}

export class RedshiftParameters {
  IAMParameters?: RedshiftIAMParameters;
  ClusterId?: Value<string>;
  Port?: Value<number>;
  Database!: Value<string>;
  Host?: Value<string>;
  IdentityCenterConfiguration?: IdentityCenterConfiguration;
  constructor(properties: RedshiftParameters) {
    Object.assign(this, properties);
  }
}

export class ResourcePermission {
  Actions!: List<Value<string>>;
  Resource?: Value<string>;
  Principal!: Value<string>;
  constructor(properties: ResourcePermission) {
    Object.assign(this, properties);
  }
}

export class S3Parameters {
  ManifestFileLocation!: ManifestFileLocation;
  RoleArn?: Value<string>;
  constructor(properties: S3Parameters) {
    Object.assign(this, properties);
  }
}

export class SnowflakeParameters {
  Warehouse!: Value<string>;
  DatabaseAccessControlRole?: Value<string>;
  Database!: Value<string>;
  OAuthParameters?: OAuthParameters;
  Host!: Value<string>;
  AuthenticationType?: Value<string>;
  constructor(properties: SnowflakeParameters) {
    Object.assign(this, properties);
  }
}

export class SparkParameters {
  Port!: Value<number>;
  Host!: Value<string>;
  constructor(properties: SparkParameters) {
    Object.assign(this, properties);
  }
}

export class SqlServerParameters {
  Port!: Value<number>;
  Database!: Value<string>;
  Host!: Value<string>;
  constructor(properties: SqlServerParameters) {
    Object.assign(this, properties);
  }
}

export class SslProperties {
  DisableSsl?: Value<boolean>;
  constructor(properties: SslProperties) {
    Object.assign(this, properties);
  }
}

export class StarburstParameters {
  Port!: Value<number>;
  DatabaseAccessControlRole?: Value<string>;
  ProductType?: Value<string>;
  OAuthParameters?: OAuthParameters;
  Host!: Value<string>;
  Catalog!: Value<string>;
  AuthenticationType?: Value<string>;
  constructor(properties: StarburstParameters) {
    Object.assign(this, properties);
  }
}

export class TeradataParameters {
  Port!: Value<number>;
  Database!: Value<string>;
  Host!: Value<string>;
  constructor(properties: TeradataParameters) {
    Object.assign(this, properties);
  }
}

export class TrinoParameters {
  Port!: Value<number>;
  Host!: Value<string>;
  Catalog!: Value<string>;
  constructor(properties: TrinoParameters) {
    Object.assign(this, properties);
  }
}

export class VpcConnectionProperties {
  VpcConnectionArn!: Value<string>;
  constructor(properties: VpcConnectionProperties) {
    Object.assign(this, properties);
  }
}
export interface DataSourceProperties {
  ErrorInfo?: DataSourceErrorInfo;
  FolderArns?: List<Value<string>>;
  Name: Value<string>;
  DataSourceParameters?: DataSourceParameters;
  Type: Value<string>;
  VpcConnectionProperties?: VpcConnectionProperties;
  AlternateDataSourceParameters?: List<DataSourceParameters>;
  AwsAccountId?: Value<string>;
  Permissions?: List<ResourcePermission>;
  SslProperties?: SslProperties;
  Credentials?: DataSourceCredentials;
  DataSourceId?: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class DataSource extends ResourceBase<DataSourceProperties> {
  static AmazonElasticsearchParameters = AmazonElasticsearchParameters;
  static AmazonOpenSearchParameters = AmazonOpenSearchParameters;
  static AthenaParameters = AthenaParameters;
  static AuroraParameters = AuroraParameters;
  static AuroraPostgreSqlParameters = AuroraPostgreSqlParameters;
  static CredentialPair = CredentialPair;
  static DataSourceCredentials = DataSourceCredentials;
  static DataSourceErrorInfo = DataSourceErrorInfo;
  static DataSourceParameters = DataSourceParameters;
  static DatabricksParameters = DatabricksParameters;
  static IdentityCenterConfiguration = IdentityCenterConfiguration;
  static ManifestFileLocation = ManifestFileLocation;
  static MariaDbParameters = MariaDbParameters;
  static MySqlParameters = MySqlParameters;
  static OAuthParameters = OAuthParameters;
  static OracleParameters = OracleParameters;
  static PostgreSqlParameters = PostgreSqlParameters;
  static PrestoParameters = PrestoParameters;
  static RdsParameters = RdsParameters;
  static RedshiftIAMParameters = RedshiftIAMParameters;
  static RedshiftParameters = RedshiftParameters;
  static ResourcePermission = ResourcePermission;
  static S3Parameters = S3Parameters;
  static SnowflakeParameters = SnowflakeParameters;
  static SparkParameters = SparkParameters;
  static SqlServerParameters = SqlServerParameters;
  static SslProperties = SslProperties;
  static StarburstParameters = StarburstParameters;
  static TeradataParameters = TeradataParameters;
  static TrinoParameters = TrinoParameters;
  static VpcConnectionProperties = VpcConnectionProperties;
  constructor(properties: DataSourceProperties) {
    super('AWS::QuickSight::DataSource', properties);
  }
}
