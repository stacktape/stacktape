import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
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

export class CredentialProvider {
  OauthCredentialProvider?: OAuthCredentialProvider;
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

export class McpLambdaTargetConfiguration {
  LambdaArn!: Value<string>;
  ToolSchema!: ToolSchema;
  constructor(properties: McpLambdaTargetConfiguration) {
    Object.assign(this, properties);
  }
}

export class McpTargetConfiguration {
  OpenApiSchema?: ApiSchemaConfiguration;
  SmithyModel?: ApiSchemaConfiguration;
  Lambda?: McpLambdaTargetConfiguration;
  constructor(properties: McpTargetConfiguration) {
    Object.assign(this, properties);
  }
}

export class OAuthCredentialProvider {
  ProviderArn!: Value<string>;
  Scopes!: List<Value<string>>;
  CustomParameters?: { [key: string]: Value<string> };
  constructor(properties: OAuthCredentialProvider) {
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
  Description?: Value<string>;
  Required?: List<Value<string>>;
  Items?: SchemaDefinition;
  Properties?: { [key: string]: SchemaDefinition };
  constructor(properties: SchemaDefinition) {
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
  CredentialProviderConfigurations: List<CredentialProviderConfiguration>;
  Name: Value<string>;
}
export default class GatewayTarget extends ResourceBase<GatewayTargetProperties> {
  static ApiKeyCredentialProvider = ApiKeyCredentialProvider;
  static ApiSchemaConfiguration = ApiSchemaConfiguration;
  static CredentialProvider = CredentialProvider;
  static CredentialProviderConfiguration = CredentialProviderConfiguration;
  static McpLambdaTargetConfiguration = McpLambdaTargetConfiguration;
  static McpTargetConfiguration = McpTargetConfiguration;
  static OAuthCredentialProvider = OAuthCredentialProvider;
  static S3Configuration = S3Configuration;
  static SchemaDefinition = SchemaDefinition;
  static TargetConfiguration = TargetConfiguration;
  static ToolDefinition = ToolDefinition;
  static ToolSchema = ToolSchema;
  constructor(properties: GatewayTargetProperties) {
    super('AWS::BedrockAgentCore::GatewayTarget', properties);
  }
}
