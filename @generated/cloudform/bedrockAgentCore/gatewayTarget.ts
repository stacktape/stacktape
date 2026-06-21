import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class ApiGatewayTargetConfiguration {
  ApiGatewayToolConfiguration!: ApiGatewayToolConfiguration;
  RestApiId!: Value<string>;
  Stage!: Value<string>;
  constructor(properties: ApiGatewayTargetConfiguration) {
    Object.assign(this, properties);
  }
}

export class ApiGatewayToolConfiguration {
  ToolFilters!: List<ApiGatewayToolFilter>;
  ToolOverrides?: List<ApiGatewayToolOverride>;
  constructor(properties: ApiGatewayToolConfiguration) {
    Object.assign(this, properties);
  }
}

export class ApiGatewayToolFilter {
  FilterPath!: Value<string>;
  Methods!: List<Value<string>>;
  constructor(properties: ApiGatewayToolFilter) {
    Object.assign(this, properties);
  }
}

export class ApiGatewayToolOverride {
  Path!: Value<string>;
  Description?: Value<string>;
  Method!: Value<string>;
  Name!: Value<string>;
  constructor(properties: ApiGatewayToolOverride) {
    Object.assign(this, properties);
  }
}

export class ApiKeyCredentialProvider {
  ProviderArn!: Value<string>;
  CredentialLocation?: Value<string>;
  CredentialPrefix?: Value<string>;
  CredentialParameterName?: Value<string>;
  constructor(properties: ApiKeyCredentialProvider) {
    Object.assign(this, properties);
  }
}

export class ApiSchemaConfiguration {
  S3?: S3Configuration;
  InlinePayload?: Value<string>;
  constructor(properties: ApiSchemaConfiguration) {
    Object.assign(this, properties);
  }
}

export class AuthorizationData {
  Oauth2!: OAuth2AuthorizationData;
  constructor(properties: AuthorizationData) {
    Object.assign(this, properties);
  }
}

export class CredentialProvider {
  OauthCredentialProvider?: OAuthCredentialProvider;
  IamCredentialProvider?: IamCredentialProvider;
  ApiKeyCredentialProvider?: ApiKeyCredentialProvider;
  constructor(properties: CredentialProvider) {
    Object.assign(this, properties);
  }
}

export class CredentialProviderConfiguration {
  CredentialProvider?: CredentialProvider;
  CredentialProviderType!: Value<string>;
  constructor(properties: CredentialProviderConfiguration) {
    Object.assign(this, properties);
  }
}

export class IamCredentialProvider {
  Service!: Value<string>;
  Region?: Value<string>;
  constructor(properties: IamCredentialProvider) {
    Object.assign(this, properties);
  }
}

export class ManagedResourceDetails {
  ResourceGatewayArn?: Value<string>;
  ResourceAssociationArn?: Value<string>;
  Domain?: Value<string>;
  constructor(properties: ManagedResourceDetails) {
    Object.assign(this, properties);
  }
}

export class ManagedVpcResource {
  RoutingDomain?: Value<string>;
  VpcIdentifier!: Value<string>;
  SubnetIds!: List<Value<string>>;
  EndpointIpAddressType!: Value<string>;
  SecurityGroupIds?: List<Value<string>>;
  constructor(properties: ManagedVpcResource) {
    Object.assign(this, properties);
  }
}

export class McpLambdaTargetConfiguration {
  LambdaArn!: Value<string>;
  ToolSchema!: ToolSchema;
  constructor(properties: McpLambdaTargetConfiguration) {
    Object.assign(this, properties);
  }
}

export class McpServerTargetConfiguration {
  Endpoint!: Value<string>;
  ListingMode?: Value<string>;
  McpToolSchema?: McpToolSchemaConfiguration;
  constructor(properties: McpServerTargetConfiguration) {
    Object.assign(this, properties);
  }
}

export class McpTargetConfiguration {
  McpServer?: McpServerTargetConfiguration;
  OpenApiSchema?: ApiSchemaConfiguration;
  SmithyModel?: ApiSchemaConfiguration;
  Lambda?: McpLambdaTargetConfiguration;
  ApiGateway?: ApiGatewayTargetConfiguration;
  constructor(properties: McpTargetConfiguration) {
    Object.assign(this, properties);
  }
}

export class McpToolSchemaConfiguration {
  S3?: S3Configuration;
  InlinePayload?: Value<string>;
  constructor(properties: McpToolSchemaConfiguration) {
    Object.assign(this, properties);
  }
}

export class MetadataConfiguration {
  AllowedQueryParameters?: List<Value<string>>;
  AllowedResponseHeaders?: List<Value<string>>;
  AllowedRequestHeaders?: List<Value<string>>;
  constructor(properties: MetadataConfiguration) {
    Object.assign(this, properties);
  }
}

export class OAuth2AuthorizationData {
  AuthorizationUrl!: Value<string>;
  UserId?: Value<string>;
  constructor(properties: OAuth2AuthorizationData) {
    Object.assign(this, properties);
  }
}

export class OAuthCredentialProvider {
  DefaultReturnUrl?: Value<string>;
  ProviderArn!: Value<string>;
  Scopes!: List<Value<string>>;
  GrantType?: Value<string>;
  CustomParameters?: { [key: string]: Value<string> };
  constructor(properties: OAuthCredentialProvider) {
    Object.assign(this, properties);
  }
}

export class PrivateEndpoint {
  ManagedVpcResource?: ManagedVpcResource;
  SelfManagedLatticeResource?: SelfManagedLatticeResource;
  constructor(properties: PrivateEndpoint) {
    Object.assign(this, properties);
  }
}

export class S3Configuration {
  BucketOwnerAccountId?: Value<string>;
  Uri?: Value<string>;
  constructor(properties: S3Configuration) {
    Object.assign(this, properties);
  }
}

export class SchemaDefinition {
  Type!: Value<string>;
  Items?: SchemaDefinition;
  Description?: Value<string>;
  Required?: List<Value<string>>;
  Properties?: { [key: string]: SchemaDefinition };
  constructor(properties: SchemaDefinition) {
    Object.assign(this, properties);
  }
}

export class SelfManagedLatticeResource {
  ResourceConfigurationIdentifier!: Value<string>;
  constructor(properties: SelfManagedLatticeResource) {
    Object.assign(this, properties);
  }
}

export class TargetConfiguration {
  Mcp!: McpTargetConfiguration;
  constructor(properties: TargetConfiguration) {
    Object.assign(this, properties);
  }
}

export class ToolDefinition {
  OutputSchema?: SchemaDefinition;
  Description!: Value<string>;
  InputSchema!: SchemaDefinition;
  Name!: Value<string>;
  constructor(properties: ToolDefinition) {
    Object.assign(this, properties);
  }
}

export class ToolSchema {
  S3?: S3Configuration;
  InlinePayload?: List<ToolDefinition>;
  constructor(properties: ToolSchema) {
    Object.assign(this, properties);
  }
}
export interface GatewayTargetProperties {
  Description?: Value<string>;
  TargetConfiguration: TargetConfiguration;
  GatewayIdentifier?: Value<string>;
  MetadataConfiguration?: MetadataConfiguration;
  CredentialProviderConfigurations?: List<CredentialProviderConfiguration>;
  PrivateEndpoint?: PrivateEndpoint;
  Name: Value<string>;
}
export default class GatewayTarget extends ResourceBase<GatewayTargetProperties> {
  static ApiGatewayTargetConfiguration = ApiGatewayTargetConfiguration;
  static ApiGatewayToolConfiguration = ApiGatewayToolConfiguration;
  static ApiGatewayToolFilter = ApiGatewayToolFilter;
  static ApiGatewayToolOverride = ApiGatewayToolOverride;
  static ApiKeyCredentialProvider = ApiKeyCredentialProvider;
  static ApiSchemaConfiguration = ApiSchemaConfiguration;
  static AuthorizationData = AuthorizationData;
  static CredentialProvider = CredentialProvider;
  static CredentialProviderConfiguration = CredentialProviderConfiguration;
  static IamCredentialProvider = IamCredentialProvider;
  static ManagedResourceDetails = ManagedResourceDetails;
  static ManagedVpcResource = ManagedVpcResource;
  static McpLambdaTargetConfiguration = McpLambdaTargetConfiguration;
  static McpServerTargetConfiguration = McpServerTargetConfiguration;
  static McpTargetConfiguration = McpTargetConfiguration;
  static McpToolSchemaConfiguration = McpToolSchemaConfiguration;
  static MetadataConfiguration = MetadataConfiguration;
  static OAuth2AuthorizationData = OAuth2AuthorizationData;
  static OAuthCredentialProvider = OAuthCredentialProvider;
  static PrivateEndpoint = PrivateEndpoint;
  static S3Configuration = S3Configuration;
  static SchemaDefinition = SchemaDefinition;
  static SelfManagedLatticeResource = SelfManagedLatticeResource;
  static TargetConfiguration = TargetConfiguration;
  static ToolDefinition = ToolDefinition;
  static ToolSchema = ToolSchema;
  constructor(properties: GatewayTargetProperties) {
    super('AWS::BedrockAgentCore::GatewayTarget', properties);
  }
}
