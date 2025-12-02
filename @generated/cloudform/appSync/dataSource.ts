import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class AuthorizationConfig {
  AwsIamConfig?: AwsIamConfig;
  AuthorizationType!: Value<string>;
  constructor(properties: AuthorizationConfig) {
    Object.assign(this, properties);
  }
}

export class AwsIamConfig {
  SigningRegion?: Value<string>;
  SigningServiceName?: Value<string>;
  constructor(properties: AwsIamConfig) {
    Object.assign(this, properties);
  }
}

export class DeltaSyncConfig {
  BaseTableTTL!: Value<string>;
  DeltaSyncTableTTL!: Value<string>;
  DeltaSyncTableName!: Value<string>;
  constructor(properties: DeltaSyncConfig) {
    Object.assign(this, properties);
  }
}

export class DynamoDBConfig {
  TableName!: Value<string>;
  AwsRegion!: Value<string>;
  Versioned?: Value<boolean>;
  DeltaSyncConfig?: DeltaSyncConfig;
  UseCallerCredentials?: Value<boolean>;
  constructor(properties: DynamoDBConfig) {
    Object.assign(this, properties);
  }
}

export class EventBridgeConfig {
  EventBusArn!: Value<string>;
  constructor(properties: EventBridgeConfig) {
    Object.assign(this, properties);
  }
}

export class HttpConfig {
  Endpoint!: Value<string>;
  AuthorizationConfig?: AuthorizationConfig;
  constructor(properties: HttpConfig) {
    Object.assign(this, properties);
  }
}

export class LambdaConfig {
  LambdaFunctionArn!: Value<string>;
  constructor(properties: LambdaConfig) {
    Object.assign(this, properties);
  }
}

export class OpenSearchServiceConfig {
  AwsRegion!: Value<string>;
  Endpoint!: Value<string>;
  constructor(properties: OpenSearchServiceConfig) {
    Object.assign(this, properties);
  }
}

export class RdsHttpEndpointConfig {
  AwsRegion!: Value<string>;
  Schema?: Value<string>;
  DatabaseName?: Value<string>;
  DbClusterIdentifier!: Value<string>;
  AwsSecretStoreArn!: Value<string>;
  constructor(properties: RdsHttpEndpointConfig) {
    Object.assign(this, properties);
  }
}

export class RelationalDatabaseConfig {
  RdsHttpEndpointConfig?: RdsHttpEndpointConfig;
  RelationalDatabaseSourceType!: Value<string>;
  constructor(properties: RelationalDatabaseConfig) {
    Object.assign(this, properties);
  }
}
export interface DataSourceProperties {
  OpenSearchServiceConfig?: OpenSearchServiceConfig;
  Type: Value<string>;
  Description?: Value<string>;
  ServiceRoleArn?: Value<string>;
  EventBridgeConfig?: EventBridgeConfig;
  HttpConfig?: HttpConfig;
  RelationalDatabaseConfig?: RelationalDatabaseConfig;
  LambdaConfig?: LambdaConfig;
  ApiId: Value<string>;
  MetricsConfig?: Value<string>;
  Name: Value<string>;
  DynamoDBConfig?: DynamoDBConfig;
}
export default class DataSource extends ResourceBase<DataSourceProperties> {
  static AuthorizationConfig = AuthorizationConfig;
  static AwsIamConfig = AwsIamConfig;
  static DeltaSyncConfig = DeltaSyncConfig;
  static DynamoDBConfig = DynamoDBConfig;
  static EventBridgeConfig = EventBridgeConfig;
  static HttpConfig = HttpConfig;
  static LambdaConfig = LambdaConfig;
  static OpenSearchServiceConfig = OpenSearchServiceConfig;
  static RdsHttpEndpointConfig = RdsHttpEndpointConfig;
  static RelationalDatabaseConfig = RelationalDatabaseConfig;
  constructor(properties: DataSourceProperties) {
    super('AWS::AppSync::DataSource', properties);
  }
}
