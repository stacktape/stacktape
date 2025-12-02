import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AgentRuntimeArtifact {
  ContainerConfiguration?: ContainerConfiguration;
  constructor(properties: AgentRuntimeArtifact) {
    Object.assign(this, properties);
  }
}

export class AuthorizerConfiguration {
  CustomJWTAuthorizer?: CustomJWTAuthorizerConfiguration;
  constructor(properties: AuthorizerConfiguration) {
    Object.assign(this, properties);
  }
}

export class ContainerConfiguration {
  ContainerUri!: Value<string>;
  constructor(properties: ContainerConfiguration) {
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

export class NetworkConfiguration {
  NetworkModeConfig?: VpcConfig;
  NetworkMode!: Value<string>;
  constructor(properties: NetworkConfiguration) {
    Object.assign(this, properties);
  }
}

export class VpcConfig {
  SecurityGroups!: List<Value<string>>;
  Subnets!: List<Value<string>>;
  constructor(properties: VpcConfig) {
    Object.assign(this, properties);
  }
}

export class WorkloadIdentityDetails {
  WorkloadIdentityArn!: Value<string>;
  constructor(properties: WorkloadIdentityDetails) {
    Object.assign(this, properties);
  }
}
export interface RuntimeProperties {
  ProtocolConfiguration?: Value<string>;
  Description?: Value<string>;
  EnvironmentVariables?: { [key: string]: Value<string> };
  NetworkConfiguration: NetworkConfiguration;
  AgentRuntimeName: Value<string>;
  AgentRuntimeArtifact: AgentRuntimeArtifact;
  RoleArn: Value<string>;
  Tags?: { [key: string]: Value<string> };
  AuthorizerConfiguration?: AuthorizerConfiguration;
}
export default class Runtime extends ResourceBase<RuntimeProperties> {
  static AgentRuntimeArtifact = AgentRuntimeArtifact;
  static AuthorizerConfiguration = AuthorizerConfiguration;
  static ContainerConfiguration = ContainerConfiguration;
  static CustomJWTAuthorizerConfiguration = CustomJWTAuthorizerConfiguration;
  static NetworkConfiguration = NetworkConfiguration;
  static VpcConfig = VpcConfig;
  static WorkloadIdentityDetails = WorkloadIdentityDetails;
  constructor(properties: RuntimeProperties) {
    super('AWS::BedrockAgentCore::Runtime', properties);
  }
}
