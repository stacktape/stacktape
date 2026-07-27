import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AWSResources {
  LogGroups?: List<Value<string>>;
  Vpcs?: List<VpcConfig>;
  IamRoles?: List<Value<string>>;
  SecretArns?: List<Value<string>>;
  S3Buckets?: List<Value<string>>;
  LambdaFunctionArns?: List<Value<string>>;
  constructor(properties: AWSResources) {
    Object.assign(this, properties);
  }
}

export class CodeReviewSettings {
  ControlsScanning!: Value<boolean>;
  GeneralPurposeScanning!: Value<boolean>;
  constructor(properties: CodeReviewSettings) {
    Object.assign(this, properties);
  }
}

export class GitHubCapabilitiesResource {
  RemediateCode!: Value<boolean>;
  LeaveComments!: Value<boolean>;
  constructor(properties: GitHubCapabilitiesResource) {
    Object.assign(this, properties);
  }
}

export class GitHubRepositoryResource {
  Owner!: Value<string>;
  Name!: Value<string>;
  constructor(properties: GitHubRepositoryResource) {
    Object.assign(this, properties);
  }
}

export class IntegratedResource {
  Integration!: Value<string>;
  ProviderResources!: List<ProviderResource>;
  constructor(properties: IntegratedResource) {
    Object.assign(this, properties);
  }
}

export class ProviderResource {
  GitHubRepository!: GitHubRepositoryResource;
  GitHubCapabilities!: GitHubCapabilitiesResource;
  constructor(properties: ProviderResource) {
    Object.assign(this, properties);
  }
}

export class VpcConfig {
  SubnetArns?: List<Value<string>>;
  VpcArn?: Value<string>;
  SecurityGroupArns?: List<Value<string>>;
  constructor(properties: VpcConfig) {
    Object.assign(this, properties);
  }
}
export interface AgentSpaceProperties {
  IntegratedResources?: List<IntegratedResource>;
  Description?: Value<string>;
  KmsKeyId?: Value<string>;
  TargetDomainIds?: List<Value<string>>;
  CodeReviewSettings?: CodeReviewSettings;
  AwsResources?: AWSResources;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
}
export default class AgentSpace extends ResourceBase<AgentSpaceProperties> {
  static AWSResources = AWSResources;
  static CodeReviewSettings = CodeReviewSettings;
  static GitHubCapabilitiesResource = GitHubCapabilitiesResource;
  static GitHubRepositoryResource = GitHubRepositoryResource;
  static IntegratedResource = IntegratedResource;
  static ProviderResource = ProviderResource;
  static VpcConfig = VpcConfig;
  constructor(properties: AgentSpaceProperties) {
    super('AWS::SecurityAgent::AgentSpace', properties);
  }
}
