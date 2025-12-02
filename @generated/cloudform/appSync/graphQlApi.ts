import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AdditionalAuthenticationProvider {
  OpenIDConnectConfig?: OpenIDConnectConfig;
  LambdaAuthorizerConfig?: LambdaAuthorizerConfig;
  UserPoolConfig?: CognitoUserPoolConfig;
  AuthenticationType!: Value<string>;
  constructor(properties: AdditionalAuthenticationProvider) {
    Object.assign(this, properties);
  }
}

export class CognitoUserPoolConfig {
  AppIdClientRegex?: Value<string>;
  UserPoolId?: Value<string>;
  AwsRegion?: Value<string>;
  constructor(properties: CognitoUserPoolConfig) {
    Object.assign(this, properties);
  }
}

export class EnhancedMetricsConfig {
  OperationLevelMetricsConfig!: Value<string>;
  ResolverLevelMetricsBehavior!: Value<string>;
  DataSourceLevelMetricsBehavior!: Value<string>;
  constructor(properties: EnhancedMetricsConfig) {
    Object.assign(this, properties);
  }
}

export class LambdaAuthorizerConfig {
  IdentityValidationExpression?: Value<string>;
  AuthorizerUri?: Value<string>;
  AuthorizerResultTtlInSeconds?: Value<number>;
  constructor(properties: LambdaAuthorizerConfig) {
    Object.assign(this, properties);
  }
}

export class LogConfig {
  CloudWatchLogsRoleArn?: Value<string>;
  ExcludeVerboseContent?: Value<boolean>;
  FieldLogLevel?: Value<string>;
  constructor(properties: LogConfig) {
    Object.assign(this, properties);
  }
}

export class OpenIDConnectConfig {
  Issuer?: Value<string>;
  ClientId?: Value<string>;
  AuthTTL?: Value<number>;
  IatTTL?: Value<number>;
  constructor(properties: OpenIDConnectConfig) {
    Object.assign(this, properties);
  }
}

export class UserPoolConfig {
  AppIdClientRegex?: Value<string>;
  UserPoolId?: Value<string>;
  AwsRegion?: Value<string>;
  DefaultAction?: Value<string>;
  constructor(properties: UserPoolConfig) {
    Object.assign(this, properties);
  }
}
export interface GraphQLApiProperties {
  QueryDepthLimit?: Value<number>;
  OpenIDConnectConfig?: OpenIDConnectConfig;
  IntrospectionConfig?: Value<string>;
  MergedApiExecutionRoleArn?: Value<string>;
  EnhancedMetricsConfig?: EnhancedMetricsConfig;
  OwnerContact?: Value<string>;
  ResolverCountLimit?: Value<number>;
  Name: Value<string>;
  AdditionalAuthenticationProviders?: List<AdditionalAuthenticationProvider>;
  EnvironmentVariables?: { [key: string]: any };
  ApiType?: Value<string>;
  LambdaAuthorizerConfig?: LambdaAuthorizerConfig;
  XrayEnabled?: Value<boolean>;
  Visibility?: Value<string>;
  UserPoolConfig?: UserPoolConfig;
  Tags?: List<ResourceTag>;
  AuthenticationType: Value<string>;
  LogConfig?: LogConfig;
}
export default class GraphQLApi extends ResourceBase<GraphQLApiProperties> {
  static AdditionalAuthenticationProvider = AdditionalAuthenticationProvider;
  static CognitoUserPoolConfig = CognitoUserPoolConfig;
  static EnhancedMetricsConfig = EnhancedMetricsConfig;
  static LambdaAuthorizerConfig = LambdaAuthorizerConfig;
  static LogConfig = LogConfig;
  static OpenIDConnectConfig = OpenIDConnectConfig;
  static UserPoolConfig = UserPoolConfig;
  constructor(properties: GraphQLApiProperties) {
    super('AWS::AppSync::GraphQLApi', properties);
  }
}
