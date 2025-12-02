import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class ActionDeclaration {
  ActionTypeId!: ActionTypeId;
  Configuration?: { [key: string]: any };
  OutputArtifacts?: List<OutputArtifact>;
  OutputVariables?: List<Value<string>>;
  Namespace?: Value<string>;
  RoleArn?: Value<string>;
  Name!: Value<string>;
  EnvironmentVariables?: List<EnvironmentVariable>;
  InputArtifacts?: List<InputArtifact>;
  Commands?: List<Value<string>>;
  Region?: Value<string>;
  RunOrder?: Value<number>;
  TimeoutInMinutes?: Value<number>;
  constructor(properties: ActionDeclaration) {
    Object.assign(this, properties);
  }
}

export class ActionTypeId {
  Owner!: Value<string>;
  Category!: Value<string>;
  Version!: Value<string>;
  Provider!: Value<string>;
  constructor(properties: ActionTypeId) {
    Object.assign(this, properties);
  }
}

export class ArtifactStore {
  Type!: Value<string>;
  EncryptionKey?: EncryptionKey;
  Location!: Value<string>;
  constructor(properties: ArtifactStore) {
    Object.assign(this, properties);
  }
}

export class ArtifactStoreMap {
  ArtifactStore!: ArtifactStore;
  Region!: Value<string>;
  constructor(properties: ArtifactStoreMap) {
    Object.assign(this, properties);
  }
}

export class BeforeEntryConditions {
  Conditions?: List<Condition>;
  constructor(properties: BeforeEntryConditions) {
    Object.assign(this, properties);
  }
}

export class BlockerDeclaration {
  Type!: Value<string>;
  Name!: Value<string>;
  constructor(properties: BlockerDeclaration) {
    Object.assign(this, properties);
  }
}

export class Condition {
  Rules?: List<RuleDeclaration>;
  Result?: Value<string>;
  constructor(properties: Condition) {
    Object.assign(this, properties);
  }
}

export class EncryptionKey {
  Type!: Value<string>;
  Id!: Value<string>;
  constructor(properties: EncryptionKey) {
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

export class FailureConditions {
  RetryConfiguration?: RetryConfiguration;
  Conditions?: List<Condition>;
  Result?: Value<string>;
  constructor(properties: FailureConditions) {
    Object.assign(this, properties);
  }
}

export class GitBranchFilterCriteria {
  Includes?: List<Value<string>>;
  Excludes?: List<Value<string>>;
  constructor(properties: GitBranchFilterCriteria) {
    Object.assign(this, properties);
  }
}

export class GitConfiguration {
  PullRequest?: List<GitPullRequestFilter>;
  Push?: List<GitPushFilter>;
  SourceActionName!: Value<string>;
  constructor(properties: GitConfiguration) {
    Object.assign(this, properties);
  }
}

export class GitFilePathFilterCriteria {
  Includes?: List<Value<string>>;
  Excludes?: List<Value<string>>;
  constructor(properties: GitFilePathFilterCriteria) {
    Object.assign(this, properties);
  }
}

export class GitPullRequestFilter {
  FilePaths?: GitFilePathFilterCriteria;
  Events?: List<Value<string>>;
  Branches?: GitBranchFilterCriteria;
  constructor(properties: GitPullRequestFilter) {
    Object.assign(this, properties);
  }
}

export class GitPushFilter {
  FilePaths?: GitFilePathFilterCriteria;
  Branches?: GitBranchFilterCriteria;
  Tags?: GitTagFilterCriteria;
  constructor(properties: GitPushFilter) {
    Object.assign(this, properties);
  }
}

export class GitTagFilterCriteria {
  Includes?: List<Value<string>>;
  Excludes?: List<Value<string>>;
  constructor(properties: GitTagFilterCriteria) {
    Object.assign(this, properties);
  }
}

export class InputArtifact {
  Name!: Value<string>;
  constructor(properties: InputArtifact) {
    Object.assign(this, properties);
  }
}

export class OutputArtifact {
  Files?: List<Value<string>>;
  Name!: Value<string>;
  constructor(properties: OutputArtifact) {
    Object.assign(this, properties);
  }
}

export class PipelineTriggerDeclaration {
  GitConfiguration?: GitConfiguration;
  ProviderType!: Value<string>;
  constructor(properties: PipelineTriggerDeclaration) {
    Object.assign(this, properties);
  }
}

export class RetryConfiguration {
  RetryMode?: Value<string>;
  constructor(properties: RetryConfiguration) {
    Object.assign(this, properties);
  }
}

export class RuleDeclaration {
  RuleTypeId?: RuleTypeId;
  Configuration?: { [key: string]: any };
  InputArtifacts?: List<InputArtifact>;
  Commands?: List<Value<string>>;
  Region?: Value<string>;
  RoleArn?: Value<string>;
  Name?: Value<string>;
  constructor(properties: RuleDeclaration) {
    Object.assign(this, properties);
  }
}

export class RuleTypeId {
  Owner?: Value<string>;
  Category?: Value<string>;
  Version?: Value<string>;
  Provider?: Value<string>;
  constructor(properties: RuleTypeId) {
    Object.assign(this, properties);
  }
}

export class StageDeclaration {
  Blockers?: List<BlockerDeclaration>;
  Actions!: List<ActionDeclaration>;
  BeforeEntry?: BeforeEntryConditions;
  OnSuccess?: SuccessConditions;
  Name!: Value<string>;
  OnFailure?: FailureConditions;
  constructor(properties: StageDeclaration) {
    Object.assign(this, properties);
  }
}

export class StageTransition {
  StageName!: Value<string>;
  Reason!: Value<string>;
  constructor(properties: StageTransition) {
    Object.assign(this, properties);
  }
}

export class SuccessConditions {
  Conditions?: List<Condition>;
  constructor(properties: SuccessConditions) {
    Object.assign(this, properties);
  }
}

export class VariableDeclaration {
  DefaultValue?: Value<string>;
  Description?: Value<string>;
  Name!: Value<string>;
  constructor(properties: VariableDeclaration) {
    Object.assign(this, properties);
  }
}
export interface PipelineProperties {
  Variables?: List<VariableDeclaration>;
  ArtifactStores?: List<ArtifactStoreMap>;
  ArtifactStore?: ArtifactStore;
  DisableInboundStageTransitions?: List<StageTransition>;
  Stages: List<StageDeclaration>;
  PipelineType?: Value<string>;
  ExecutionMode?: Value<string>;
  RestartExecutionOnUpdate?: Value<boolean>;
  Triggers?: List<PipelineTriggerDeclaration>;
  RoleArn: Value<string>;
  Tags?: List<ResourceTag>;
  Name?: Value<string>;
}
export default class Pipeline extends ResourceBase<PipelineProperties> {
  static ActionDeclaration = ActionDeclaration;
  static ActionTypeId = ActionTypeId;
  static ArtifactStore = ArtifactStore;
  static ArtifactStoreMap = ArtifactStoreMap;
  static BeforeEntryConditions = BeforeEntryConditions;
  static BlockerDeclaration = BlockerDeclaration;
  static Condition = Condition;
  static EncryptionKey = EncryptionKey;
  static EnvironmentVariable = EnvironmentVariable;
  static FailureConditions = FailureConditions;
  static GitBranchFilterCriteria = GitBranchFilterCriteria;
  static GitConfiguration = GitConfiguration;
  static GitFilePathFilterCriteria = GitFilePathFilterCriteria;
  static GitPullRequestFilter = GitPullRequestFilter;
  static GitPushFilter = GitPushFilter;
  static GitTagFilterCriteria = GitTagFilterCriteria;
  static InputArtifact = InputArtifact;
  static OutputArtifact = OutputArtifact;
  static PipelineTriggerDeclaration = PipelineTriggerDeclaration;
  static RetryConfiguration = RetryConfiguration;
  static RuleDeclaration = RuleDeclaration;
  static RuleTypeId = RuleTypeId;
  static StageDeclaration = StageDeclaration;
  static StageTransition = StageTransition;
  static SuccessConditions = SuccessConditions;
  static VariableDeclaration = VariableDeclaration;
  constructor(properties: PipelineProperties) {
    super('AWS::CodePipeline::Pipeline', properties);
  }
}
