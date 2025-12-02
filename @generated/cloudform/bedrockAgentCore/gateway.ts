import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AuthorizerConfiguration {
  CustomJWTAuthorizer!: CustomJWTAuthorizerConfiguration;
  constructor(properties: AuthorizerConfiguration) {
    Object.assign(this, properties);
  }
}

export class CustomJWTAuthorizerConfiguration {
  DiscoveryUrl!: Value<string>;
  AllowedAudience?: List<Value<string>>;
  AllowedClients?: List<Value<string>>;
  constructor(properties: CustomJWTAuthorizerConfiguration) {
    Object.assign(this, properties);
  }
}

export class GatewayProtocolConfiguration {
  Mcp!: MCPGatewayConfiguration;
  constructor(properties: GatewayProtocolConfiguration) {
    Object.assign(this, properties);
  }
}

export class MCPGatewayConfiguration {
  SupportedVersions?: List<Value<string>>;
  Instructions?: Value<string>;
  SearchType?: Value<string>;
  constructor(properties: MCPGatewayConfiguration) {
    Object.assign(this, properties);
  }
}

export class WorkloadIdentityDetails {
  WorkloadIdentityArn!: Value<string>;
  constructor(properties: WorkloadIdentityDetails) {
    Object.assign(this, properties);
  }
}
export interface GatewayProperties {
  ProtocolConfiguration?: GatewayProtocolConfiguration;
  Description?: Value<string>;
  ExceptionLevel?: Value<string>;
  KmsKeyArn?: Value<string>;
  AuthorizerType: Value<string>;
  ProtocolType: Value<string>;
  RoleArn: Value<string>;
  Tags?: { [key: string]: Value<string> };
  Name: Value<string>;
  AuthorizerConfiguration?: AuthorizerConfiguration;
}
export default class Gateway extends ResourceBase<GatewayProperties> {
  static AuthorizerConfiguration = AuthorizerConfiguration;
  static CustomJWTAuthorizerConfiguration = CustomJWTAuthorizerConfiguration;
  static GatewayProtocolConfiguration = GatewayProtocolConfiguration;
  static MCPGatewayConfiguration = MCPGatewayConfiguration;
  static WorkloadIdentityDetails = WorkloadIdentityDetails;
  constructor(properties: GatewayProperties) {
    super('AWS::BedrockAgentCore::Gateway', properties);
  }
}
