import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AuthorizerConfiguration {
  CustomJWTAuthorizer!: CustomJWTAuthorizerConfiguration;
  constructor(properties: AuthorizerConfiguration) {
    Object.assign(this, properties);
  }
}

export class AuthorizingClaimMatchValueType {
  ClaimMatchValue!: ClaimMatchValueType;
  ClaimMatchOperator!: Value<string>;
  constructor(properties: AuthorizingClaimMatchValueType) {
    Object.assign(this, properties);
  }
}

export class ClaimMatchValueType {
  MatchValueString?: Value<string>;
  MatchValueStringList?: List<Value<string>>;
  constructor(properties: ClaimMatchValueType) {
    Object.assign(this, properties);
  }
}

export class CustomClaimValidationType {
  AuthorizingClaimMatchValue!: AuthorizingClaimMatchValueType;
  InboundTokenClaimName!: Value<string>;
  InboundTokenClaimValueType!: Value<string>;
  constructor(properties: CustomClaimValidationType) {
    Object.assign(this, properties);
  }
}

export class CustomJWTAuthorizerConfiguration {
  DiscoveryUrl!: Value<string>;
  AllowedAudience?: List<Value<string>>;
  CustomClaims?: List<CustomClaimValidationType>;
  AllowedClients?: List<Value<string>>;
  AllowedScopes?: List<Value<string>>;
  constructor(properties: CustomJWTAuthorizerConfiguration) {
    Object.assign(this, properties);
  }
}

export class GatewayInterceptorConfiguration {
  InterceptionPoints!: List<Value<string>>;
  Interceptor!: InterceptorConfiguration;
  InputConfiguration?: InterceptorInputConfiguration;
  constructor(properties: GatewayInterceptorConfiguration) {
    Object.assign(this, properties);
  }
}

export class GatewayPolicyEngineConfiguration {
  Mode!: Value<string>;
  Arn!: Value<string>;
  constructor(properties: GatewayPolicyEngineConfiguration) {
    Object.assign(this, properties);
  }
}

export class GatewayProtocolConfiguration {
  Mcp!: MCPGatewayConfiguration;
  constructor(properties: GatewayProtocolConfiguration) {
    Object.assign(this, properties);
  }
}

export class InterceptorConfiguration {
  Lambda!: LambdaInterceptorConfiguration;
  constructor(properties: InterceptorConfiguration) {
    Object.assign(this, properties);
  }
}

export class InterceptorInputConfiguration {
  PassRequestHeaders!: Value<boolean>;
  constructor(properties: InterceptorInputConfiguration) {
    Object.assign(this, properties);
  }
}

export class LambdaInterceptorConfiguration {
  Arn!: Value<string>;
  constructor(properties: LambdaInterceptorConfiguration) {
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
  PolicyEngineConfiguration?: GatewayPolicyEngineConfiguration;
  ProtocolConfiguration?: GatewayProtocolConfiguration;
  Description?: Value<string>;
  ExceptionLevel?: Value<string>;
  KmsKeyArn?: Value<string>;
  AuthorizerType: Value<string>;
  ProtocolType: Value<string>;
  InterceptorConfigurations?: List<GatewayInterceptorConfiguration>;
  RoleArn: Value<string>;
  Tags?: { [key: string]: Value<string> };
  Name: Value<string>;
  AuthorizerConfiguration?: AuthorizerConfiguration;
}
export default class Gateway extends ResourceBase<GatewayProperties> {
  static AuthorizerConfiguration = AuthorizerConfiguration;
  static AuthorizingClaimMatchValueType = AuthorizingClaimMatchValueType;
  static ClaimMatchValueType = ClaimMatchValueType;
  static CustomClaimValidationType = CustomClaimValidationType;
  static CustomJWTAuthorizerConfiguration = CustomJWTAuthorizerConfiguration;
  static GatewayInterceptorConfiguration = GatewayInterceptorConfiguration;
  static GatewayPolicyEngineConfiguration = GatewayPolicyEngineConfiguration;
  static GatewayProtocolConfiguration = GatewayProtocolConfiguration;
  static InterceptorConfiguration = InterceptorConfiguration;
  static InterceptorInputConfiguration = InterceptorInputConfiguration;
  static LambdaInterceptorConfiguration = LambdaInterceptorConfiguration;
  static MCPGatewayConfiguration = MCPGatewayConfiguration;
  static WorkloadIdentityDetails = WorkloadIdentityDetails;
  constructor(properties: GatewayProperties) {
    super('AWS::BedrockAgentCore::Gateway', properties);
  }
}
