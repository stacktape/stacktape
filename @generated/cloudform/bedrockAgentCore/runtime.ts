import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AgentRuntimeArtifact {
  CodeConfiguration?: CodeConfiguration;
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

export class Code {
  S3?: S3Location;
  constructor(properties: Code) {
    Object.assign(this, properties);
  }
}

export class CodeConfiguration {
  Runtime!: Value<string>;
  EntryPoint!: List<Value<string>>;
  Code!: Code;
  constructor(properties: CodeConfiguration) {
    Object.assign(this, properties);
  }
}

export class ContainerConfiguration {
  ContainerUri!: Value<string>;
  constructor(properties: ContainerConfiguration) {
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

export class FilesystemConfiguration {
  SessionStorage?: SessionStorageConfiguration;
  S3FilesAccessPoint?: S3FilesAccessPointConfiguration;
  EfsAccessPoint?: EfsAccessPointConfiguration;
  constructor(properties: FilesystemConfiguration) {
    Object.assign(this, properties);
  }
}

export class LifecycleConfiguration {
  MaxLifetime?: Value<number>;
  IdleRuntimeSessionTimeout?: Value<number>;
  constructor(properties: LifecycleConfiguration) {
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

export class RequestHeaderConfiguration {
  RequestHeaderAllowlist?: List<Value<string>>;
  constructor(properties: RequestHeaderConfiguration) {
    Object.assign(this, properties);
  }
}

export class S3Location {
  VersionId?: Value<string>;
  Bucket!: Value<string>;
  Prefix!: Value<string>;
  constructor(properties: S3Location) {
    Object.assign(this, properties);
  }
}

export class SessionStorageConfiguration {
  MountPath!: Value<string>;
  constructor(properties: SessionStorageConfiguration) {
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

export class EfsAccessPointConfiguration {
  MountPath!: Value<string>;
  AccessPointArn!: Value<string>;
  constructor(properties: EfsAccessPointConfiguration) {
    Object.assign(this, properties);
  }
}

export class S3FilesAccessPointConfiguration {
  MountPath!: Value<string>;
  AccessPointArn!: Value<string>;
  constructor(properties: S3FilesAccessPointConfiguration) {
    Object.assign(this, properties);
  }
}
export interface RuntimeProperties {
  ProtocolConfiguration?: Value<string>;
  Description?: Value<string>;
  EnvironmentVariables?: { [key: string]: Value<string> };
  RequestHeaderConfiguration?: RequestHeaderConfiguration;
  FilesystemConfigurations?: List<FilesystemConfiguration>;
  LifecycleConfiguration?: LifecycleConfiguration;
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
  static AuthorizingClaimMatchValueType = AuthorizingClaimMatchValueType;
  static ClaimMatchValueType = ClaimMatchValueType;
  static Code = Code;
  static CodeConfiguration = CodeConfiguration;
  static ContainerConfiguration = ContainerConfiguration;
  static CustomClaimValidationType = CustomClaimValidationType;
  static CustomJWTAuthorizerConfiguration = CustomJWTAuthorizerConfiguration;
  static FilesystemConfiguration = FilesystemConfiguration;
  static LifecycleConfiguration = LifecycleConfiguration;
  static NetworkConfiguration = NetworkConfiguration;
  static RequestHeaderConfiguration = RequestHeaderConfiguration;
  static S3Location = S3Location;
  static SessionStorageConfiguration = SessionStorageConfiguration;
  static VpcConfig = VpcConfig;
  static WorkloadIdentityDetails = WorkloadIdentityDetails;
  static EfsAccessPointConfiguration = EfsAccessPointConfiguration;
  static S3FilesAccessPointConfiguration = S3FilesAccessPointConfiguration;
  constructor(properties: RuntimeProperties) {
    super('AWS::BedrockAgentCore::Runtime', properties);
  }
}
