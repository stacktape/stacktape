import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class Artifacts {
  Path?: Value<string>;
  Type!: Value<string>;
  ArtifactIdentifier?: Value<string>;
  OverrideArtifactName?: Value<boolean>;
  Packaging?: Value<string>;
  EncryptionDisabled?: Value<boolean>;
  Location?: Value<string>;
  Name?: Value<string>;
  NamespaceType?: Value<string>;
  constructor(properties: Artifacts) {
    Object.assign(this, properties);
  }
}

export class BatchRestrictions {
  ComputeTypesAllowed?: List<Value<string>>;
  MaximumBuildsAllowed?: Value<number>;
  constructor(properties: BatchRestrictions) {
    Object.assign(this, properties);
  }
}

export class BuildStatusConfig {
  Context?: Value<string>;
  TargetUrl?: Value<string>;
  constructor(properties: BuildStatusConfig) {
    Object.assign(this, properties);
  }
}

export class CloudWatchLogsConfig {
  Status!: Value<string>;
  GroupName?: Value<string>;
  StreamName?: Value<string>;
  constructor(properties: CloudWatchLogsConfig) {
    Object.assign(this, properties);
  }
}

export class DockerServer {
  ComputeType!: Value<string>;
  SecurityGroupIds?: List<Value<string>>;
  constructor(properties: DockerServer) {
    Object.assign(this, properties);
  }
}

export class Environment {
  Type!: Value<string>;
  EnvironmentVariables?: List<EnvironmentVariable>;
  Fleet?: ProjectFleet;
  PrivilegedMode?: Value<boolean>;
  ImagePullCredentialsType?: Value<string>;
  Image!: Value<string>;
  RegistryCredential?: RegistryCredential;
  ComputeType!: Value<string>;
  DockerServer?: DockerServer;
  Certificate?: Value<string>;
  constructor(properties: Environment) {
    Object.assign(this, properties);
  }
}

export class EnvironmentVariable {
  Type?: Value<string>;
  Value!: Value<string>;
  Name!: Value<string>;
  constructor(properties: EnvironmentVariable) {
    Object.assign(this, properties);
  }
}

export type FilterGroup = List<WebhookFilter>;

export class GitSubmodulesConfig {
  FetchSubmodules!: Value<boolean>;
  constructor(properties: GitSubmodulesConfig) {
    Object.assign(this, properties);
  }
}

export class LogsConfig {
  CloudWatchLogs?: CloudWatchLogsConfig;
  S3Logs?: S3LogsConfig;
  constructor(properties: LogsConfig) {
    Object.assign(this, properties);
  }
}

export class ProjectBuildBatchConfig {
  CombineArtifacts?: Value<boolean>;
  ServiceRole?: Value<string>;
  BatchReportMode?: Value<string>;
  TimeoutInMins?: Value<number>;
  Restrictions?: BatchRestrictions;
  constructor(properties: ProjectBuildBatchConfig) {
    Object.assign(this, properties);
  }
}

export class ProjectCache {
  Modes?: List<Value<string>>;
  Type!: Value<string>;
  CacheNamespace?: Value<string>;
  Location?: Value<string>;
  constructor(properties: ProjectCache) {
    Object.assign(this, properties);
  }
}

export class ProjectFileSystemLocation {
  MountPoint!: Value<string>;
  Type!: Value<string>;
  Identifier!: Value<string>;
  MountOptions?: Value<string>;
  Location!: Value<string>;
  constructor(properties: ProjectFileSystemLocation) {
    Object.assign(this, properties);
  }
}

export class ProjectFleet {
  FleetArn?: Value<string>;
  constructor(properties: ProjectFleet) {
    Object.assign(this, properties);
  }
}

export class ProjectSourceVersion {
  SourceIdentifier!: Value<string>;
  SourceVersion?: Value<string>;
  constructor(properties: ProjectSourceVersion) {
    Object.assign(this, properties);
  }
}

export class ProjectTriggers {
  FilterGroups?: List<FilterGroup>;
  BuildType?: Value<string>;
  Webhook?: Value<boolean>;
  ScopeConfiguration?: ScopeConfiguration;
  PullRequestBuildPolicy?: PullRequestBuildPolicy;
  constructor(properties: ProjectTriggers) {
    Object.assign(this, properties);
  }
}

export class PullRequestBuildPolicy {
  RequiresCommentApproval!: Value<string>;
  ApproverRoles?: List<Value<string>>;
  constructor(properties: PullRequestBuildPolicy) {
    Object.assign(this, properties);
  }
}

export class RegistryCredential {
  Credential!: Value<string>;
  CredentialProvider!: Value<string>;
  constructor(properties: RegistryCredential) {
    Object.assign(this, properties);
  }
}

export class S3LogsConfig {
  Status!: Value<string>;
  EncryptionDisabled?: Value<boolean>;
  Location?: Value<string>;
  constructor(properties: S3LogsConfig) {
    Object.assign(this, properties);
  }
}

export class ScopeConfiguration {
  Scope?: Value<string>;
  Domain?: Value<string>;
  Name!: Value<string>;
  constructor(properties: ScopeConfiguration) {
    Object.assign(this, properties);
  }
}

export class Source {
  Type!: Value<string>;
  ReportBuildStatus?: Value<boolean>;
  Auth?: SourceAuth;
  SourceIdentifier?: Value<string>;
  BuildSpec?: Value<string>;
  GitCloneDepth?: Value<number>;
  BuildStatusConfig?: BuildStatusConfig;
  GitSubmodulesConfig?: GitSubmodulesConfig;
  InsecureSsl?: Value<boolean>;
  Location?: Value<string>;
  constructor(properties: Source) {
    Object.assign(this, properties);
  }
}

export class SourceAuth {
  Type!: Value<string>;
  Resource?: Value<string>;
  constructor(properties: SourceAuth) {
    Object.assign(this, properties);
  }
}

export class VpcConfig {
  Subnets?: List<Value<string>>;
  VpcId?: Value<string>;
  SecurityGroupIds?: List<Value<string>>;
  constructor(properties: VpcConfig) {
    Object.assign(this, properties);
  }
}

export class WebhookFilter {
  Pattern!: Value<string>;
  Type!: Value<string>;
  ExcludeMatchedPattern?: Value<boolean>;
  constructor(properties: WebhookFilter) {
    Object.assign(this, properties);
  }
}
export interface ProjectProperties {
  Description?: Value<string>;
  ResourceAccessRole?: Value<string>;
  VpcConfig?: VpcConfig;
  SecondarySources?: List<Source>;
  EncryptionKey?: Value<string>;
  SecondaryArtifacts?: List<Artifacts>;
  Source: Source;
  Name?: Value<string>;
  LogsConfig?: LogsConfig;
  ServiceRole: Value<string>;
  QueuedTimeoutInMinutes?: Value<number>;
  SecondarySourceVersions?: List<ProjectSourceVersion>;
  Tags?: List<ResourceTag>;
  AutoRetryLimit?: Value<number>;
  SourceVersion?: Value<string>;
  Triggers?: ProjectTriggers;
  Artifacts: Artifacts;
  BadgeEnabled?: Value<boolean>;
  FileSystemLocations?: List<ProjectFileSystemLocation>;
  Environment: Environment;
  ConcurrentBuildLimit?: Value<number>;
  Visibility?: Value<string>;
  BuildBatchConfig?: ProjectBuildBatchConfig;
  TimeoutInMinutes?: Value<number>;
  Cache?: ProjectCache;
}
export default class Project extends ResourceBase<ProjectProperties> {
  static Artifacts = Artifacts;
  static BatchRestrictions = BatchRestrictions;
  static BuildStatusConfig = BuildStatusConfig;
  static CloudWatchLogsConfig = CloudWatchLogsConfig;
  static DockerServer = DockerServer;
  static Environment = Environment;
  static EnvironmentVariable = EnvironmentVariable;
  static GitSubmodulesConfig = GitSubmodulesConfig;
  static LogsConfig = LogsConfig;
  static ProjectBuildBatchConfig = ProjectBuildBatchConfig;
  static ProjectCache = ProjectCache;
  static ProjectFileSystemLocation = ProjectFileSystemLocation;
  static ProjectFleet = ProjectFleet;
  static ProjectSourceVersion = ProjectSourceVersion;
  static ProjectTriggers = ProjectTriggers;
  static PullRequestBuildPolicy = PullRequestBuildPolicy;
  static RegistryCredential = RegistryCredential;
  static S3LogsConfig = S3LogsConfig;
  static ScopeConfiguration = ScopeConfiguration;
  static Source = Source;
  static SourceAuth = SourceAuth;
  static VpcConfig = VpcConfig;
  static WebhookFilter = WebhookFilter;
  constructor(properties: ProjectProperties) {
    super('AWS::CodeBuild::Project', properties);
  }
}
