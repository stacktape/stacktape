import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class APISchema {
  S3?: S3Identifier;
  Payload?: Value<string>;
  constructor(properties: APISchema) {
    Object.assign(this, properties);
  }
}

export class ActionGroupExecutor {
  CustomControl?: Value<string>;
  Lambda?: Value<string>;
  constructor(properties: ActionGroupExecutor) {
    Object.assign(this, properties);
  }
}

export class AgentActionGroup {
  Description?: Value<string>;
  ApiSchema?: APISchema;
  FunctionSchema?: FunctionSchema;
  SkipResourceInUseCheckOnDelete?: Value<boolean>;
  ParentActionGroupSignature?: Value<string>;
  ActionGroupExecutor?: ActionGroupExecutor;
  ActionGroupName!: Value<string>;
  ActionGroupState?: Value<string>;
  constructor(properties: AgentActionGroup) {
    Object.assign(this, properties);
  }
}

export class AgentCollaborator {
  AgentDescriptor!: AgentDescriptor;
  CollaborationInstruction!: Value<string>;
  RelayConversationHistory?: Value<string>;
  CollaboratorName!: Value<string>;
  constructor(properties: AgentCollaborator) {
    Object.assign(this, properties);
  }
}

export class AgentDescriptor {
  AliasArn?: Value<string>;
  constructor(properties: AgentDescriptor) {
    Object.assign(this, properties);
  }
}

export class AgentKnowledgeBase {
  Description!: Value<string>;
  KnowledgeBaseState?: Value<string>;
  KnowledgeBaseId!: Value<string>;
  constructor(properties: AgentKnowledgeBase) {
    Object.assign(this, properties);
  }
}

export class CustomOrchestration {
  Executor?: OrchestrationExecutor;
  constructor(properties: CustomOrchestration) {
    Object.assign(this, properties);
  }
}

export class Function {
  Description?: Value<string>;
  Parameters?: { [key: string]: ParameterDetail };
  RequireConfirmation?: Value<string>;
  Name!: Value<string>;
  constructor(properties: Function) {
    Object.assign(this, properties);
  }
}

export class FunctionSchema {
  Functions!: List<Function>;
  constructor(properties: FunctionSchema) {
    Object.assign(this, properties);
  }
}

export class GuardrailConfiguration {
  GuardrailIdentifier?: Value<string>;
  GuardrailVersion?: Value<string>;
  constructor(properties: GuardrailConfiguration) {
    Object.assign(this, properties);
  }
}

export class InferenceConfiguration {
  TopK?: Value<number>;
  Temperature?: Value<number>;
  MaximumLength?: Value<number>;
  StopSequences?: List<Value<string>>;
  TopP?: Value<number>;
  constructor(properties: InferenceConfiguration) {
    Object.assign(this, properties);
  }
}

export class MemoryConfiguration {
  SessionSummaryConfiguration?: SessionSummaryConfiguration;
  EnabledMemoryTypes?: List<Value<string>>;
  StorageDays?: Value<number>;
  constructor(properties: MemoryConfiguration) {
    Object.assign(this, properties);
  }
}

export class OrchestrationExecutor {
  Lambda!: Value<string>;
  constructor(properties: OrchestrationExecutor) {
    Object.assign(this, properties);
  }
}

export class ParameterDetail {
  Type!: Value<string>;
  Description?: Value<string>;
  Required?: Value<boolean>;
  constructor(properties: ParameterDetail) {
    Object.assign(this, properties);
  }
}

export class PromptConfiguration {
  PromptType?: Value<string>;
  PromptState?: Value<string>;
  AdditionalModelRequestFields?: { [key: string]: any };
  BasePromptTemplate?: Value<string>;
  FoundationModel?: Value<string>;
  InferenceConfiguration?: InferenceConfiguration;
  PromptCreationMode?: Value<string>;
  ParserMode?: Value<string>;
  constructor(properties: PromptConfiguration) {
    Object.assign(this, properties);
  }
}

export class PromptOverrideConfiguration {
  PromptConfigurations!: List<PromptConfiguration>;
  OverrideLambda?: Value<string>;
  constructor(properties: PromptOverrideConfiguration) {
    Object.assign(this, properties);
  }
}

export class S3Identifier {
  S3BucketName?: Value<string>;
  S3ObjectKey?: Value<string>;
  constructor(properties: S3Identifier) {
    Object.assign(this, properties);
  }
}

export class SessionSummaryConfiguration {
  MaxRecentSessions?: Value<number>;
  constructor(properties: SessionSummaryConfiguration) {
    Object.assign(this, properties);
  }
}
export interface AgentProperties {
  AgentCollaborators?: List<AgentCollaborator>;
  Description?: Value<string>;
  SkipResourceInUseCheckOnDelete?: Value<boolean>;
  GuardrailConfiguration?: GuardrailConfiguration;
  PromptOverrideConfiguration?: PromptOverrideConfiguration;
  MemoryConfiguration?: MemoryConfiguration;
  AgentCollaboration?: Value<string>;
  Instruction?: Value<string>;
  CustomOrchestration?: CustomOrchestration;
  TestAliasTags?: { [key: string]: Value<string> };
  AgentResourceRoleArn?: Value<string>;
  OrchestrationType?: Value<string>;
  IdleSessionTTLInSeconds?: Value<number>;
  FoundationModel?: Value<string>;
  CustomerEncryptionKeyArn?: Value<string>;
  AgentName: Value<string>;
  KnowledgeBases?: List<AgentKnowledgeBase>;
  ActionGroups?: List<AgentActionGroup>;
  AutoPrepare?: Value<boolean>;
  Tags?: { [key: string]: Value<string> };
}
export default class Agent extends ResourceBase<AgentProperties> {
  static APISchema = APISchema;
  static ActionGroupExecutor = ActionGroupExecutor;
  static AgentActionGroup = AgentActionGroup;
  static AgentCollaborator = AgentCollaborator;
  static AgentDescriptor = AgentDescriptor;
  static AgentKnowledgeBase = AgentKnowledgeBase;
  static CustomOrchestration = CustomOrchestration;
  static Function = Function;
  static FunctionSchema = FunctionSchema;
  static GuardrailConfiguration = GuardrailConfiguration;
  static InferenceConfiguration = InferenceConfiguration;
  static MemoryConfiguration = MemoryConfiguration;
  static OrchestrationExecutor = OrchestrationExecutor;
  static ParameterDetail = ParameterDetail;
  static PromptConfiguration = PromptConfiguration;
  static PromptOverrideConfiguration = PromptOverrideConfiguration;
  static S3Identifier = S3Identifier;
  static SessionSummaryConfiguration = SessionSummaryConfiguration;
  constructor(properties: AgentProperties) {
    super('AWS::Bedrock::Agent', properties);
  }
}
