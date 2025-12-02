import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AdvancedRecognitionSetting {
  AudioRecognitionStrategy?: Value<string>;
  constructor(properties: AdvancedRecognitionSetting) {
    Object.assign(this, properties);
  }
}

export class AllowedInputTypes {
  AllowDTMFInput!: Value<boolean>;
  AllowAudioInput!: Value<boolean>;
  constructor(properties: AllowedInputTypes) {
    Object.assign(this, properties);
  }
}

export class AudioAndDTMFInputSpecification {
  DTMFSpecification?: DTMFSpecification;
  AudioSpecification?: AudioSpecification;
  StartTimeoutMs!: Value<number>;
  constructor(properties: AudioAndDTMFInputSpecification) {
    Object.assign(this, properties);
  }
}

export class AudioLogDestination {
  S3Bucket!: S3BucketLogDestination;
  constructor(properties: AudioLogDestination) {
    Object.assign(this, properties);
  }
}

export class AudioLogSetting {
  Destination!: AudioLogDestination;
  Enabled!: Value<boolean>;
  constructor(properties: AudioLogSetting) {
    Object.assign(this, properties);
  }
}

export class AudioSpecification {
  EndTimeoutMs!: Value<number>;
  MaxLengthMs!: Value<number>;
  constructor(properties: AudioSpecification) {
    Object.assign(this, properties);
  }
}

export class BKBExactResponseFields {
  AnswerField?: Value<string>;
  constructor(properties: BKBExactResponseFields) {
    Object.assign(this, properties);
  }
}

export class BedrockAgentConfiguration {
  BedrockAgentId?: Value<string>;
  BedrockAgentAliasId?: Value<string>;
  constructor(properties: BedrockAgentConfiguration) {
    Object.assign(this, properties);
  }
}

export class BedrockAgentIntentConfiguration {
  BedrockAgentConfiguration?: BedrockAgentConfiguration;
  BedrockAgentIntentKnowledgeBaseConfiguration?: BedrockAgentIntentKnowledgeBaseConfiguration;
  constructor(properties: BedrockAgentIntentConfiguration) {
    Object.assign(this, properties);
  }
}

export class BedrockAgentIntentKnowledgeBaseConfiguration {
  BedrockModelConfiguration!: BedrockModelSpecification;
  BedrockKnowledgeBaseArn!: Value<string>;
  constructor(properties: BedrockAgentIntentKnowledgeBaseConfiguration) {
    Object.assign(this, properties);
  }
}

export class BedrockGuardrailConfiguration {
  BedrockGuardrailVersion?: Value<string>;
  BedrockGuardrailIdentifier?: Value<string>;
  constructor(properties: BedrockGuardrailConfiguration) {
    Object.assign(this, properties);
  }
}

export class BedrockKnowledgeStoreConfiguration {
  BKBExactResponseFields?: BKBExactResponseFields;
  ExactResponse?: Value<boolean>;
  BedrockKnowledgeBaseArn?: Value<string>;
  constructor(properties: BedrockKnowledgeStoreConfiguration) {
    Object.assign(this, properties);
  }
}

export class BedrockModelSpecification {
  ModelArn!: Value<string>;
  BedrockTraceStatus?: Value<string>;
  BedrockModelCustomPrompt?: Value<string>;
  BedrockGuardrailConfiguration?: BedrockGuardrailConfiguration;
  constructor(properties: BedrockModelSpecification) {
    Object.assign(this, properties);
  }
}

export class BotAliasLocaleSettings {
  CodeHookSpecification?: CodeHookSpecification;
  Enabled!: Value<boolean>;
  constructor(properties: BotAliasLocaleSettings) {
    Object.assign(this, properties);
  }
}

export class BotAliasLocaleSettingsItem {
  LocaleId!: Value<string>;
  BotAliasLocaleSetting!: BotAliasLocaleSettings;
  constructor(properties: BotAliasLocaleSettingsItem) {
    Object.assign(this, properties);
  }
}

export class BotLocale {
  NluConfidenceThreshold!: Value<number>;
  LocaleId!: Value<string>;
  Description?: Value<string>;
  GenerativeAISettings?: GenerativeAISettings;
  CustomVocabulary?: CustomVocabulary;
  SlotTypes?: List<SlotType>;
  Intents?: List<Intent>;
  VoiceSettings?: VoiceSettings;
  constructor(properties: BotLocale) {
    Object.assign(this, properties);
  }
}

export class BuildtimeSettings {
  DescriptiveBotBuilderSpecification?: DescriptiveBotBuilderSpecification;
  SampleUtteranceGenerationSpecification?: SampleUtteranceGenerationSpecification;
  constructor(properties: BuildtimeSettings) {
    Object.assign(this, properties);
  }
}

export class Button {
  Value!: Value<string>;
  Text!: Value<string>;
  constructor(properties: Button) {
    Object.assign(this, properties);
  }
}

export class CloudWatchLogGroupLogDestination {
  CloudWatchLogGroupArn!: Value<string>;
  LogPrefix!: Value<string>;
  constructor(properties: CloudWatchLogGroupLogDestination) {
    Object.assign(this, properties);
  }
}

export class CodeHookSpecification {
  LambdaCodeHook!: LambdaCodeHook;
  constructor(properties: CodeHookSpecification) {
    Object.assign(this, properties);
  }
}

export class CompositeSlotTypeSetting {
  SubSlots?: List<SubSlotTypeComposition>;
  constructor(properties: CompositeSlotTypeSetting) {
    Object.assign(this, properties);
  }
}

export class Condition {
  ExpressionString!: Value<string>;
  constructor(properties: Condition) {
    Object.assign(this, properties);
  }
}

export class ConditionalBranch {
  Condition!: Condition;
  Response?: ResponseSpecification;
  Name!: Value<string>;
  NextStep!: DialogState;
  constructor(properties: ConditionalBranch) {
    Object.assign(this, properties);
  }
}

export class ConditionalSpecification {
  DefaultBranch!: DefaultConditionalBranch;
  IsActive!: Value<boolean>;
  ConditionalBranches!: List<ConditionalBranch>;
  constructor(properties: ConditionalSpecification) {
    Object.assign(this, properties);
  }
}

export class ConversationLogSettings {
  TextLogSettings?: List<TextLogSetting>;
  AudioLogSettings?: List<AudioLogSetting>;
  constructor(properties: ConversationLogSettings) {
    Object.assign(this, properties);
  }
}

export class CustomPayload {
  Value!: Value<string>;
  constructor(properties: CustomPayload) {
    Object.assign(this, properties);
  }
}

export class CustomVocabulary {
  CustomVocabularyItems!: List<CustomVocabularyItem>;
  constructor(properties: CustomVocabulary) {
    Object.assign(this, properties);
  }
}

export class CustomVocabularyItem {
  DisplayAs?: Value<string>;
  Phrase!: Value<string>;
  Weight?: Value<number>;
  constructor(properties: CustomVocabularyItem) {
    Object.assign(this, properties);
  }
}

export class DTMFSpecification {
  DeletionCharacter!: Value<string>;
  EndTimeoutMs!: Value<number>;
  EndCharacter!: Value<string>;
  MaxLength!: Value<number>;
  constructor(properties: DTMFSpecification) {
    Object.assign(this, properties);
  }
}

export class DataPrivacy {
  ChildDirected!: Value<boolean>;
  constructor(properties: DataPrivacy) {
    Object.assign(this, properties);
  }
}

export class DataSourceConfiguration {
  BedrockKnowledgeStoreConfiguration?: BedrockKnowledgeStoreConfiguration;
  KendraConfiguration?: QnAKendraConfiguration;
  OpensearchConfiguration?: OpensearchConfiguration;
  constructor(properties: DataSourceConfiguration) {
    Object.assign(this, properties);
  }
}

export class DefaultConditionalBranch {
  Response?: ResponseSpecification;
  NextStep?: DialogState;
  constructor(properties: DefaultConditionalBranch) {
    Object.assign(this, properties);
  }
}

export class DescriptiveBotBuilderSpecification {
  Enabled!: Value<boolean>;
  BedrockModelSpecification?: BedrockModelSpecification;
  constructor(properties: DescriptiveBotBuilderSpecification) {
    Object.assign(this, properties);
  }
}

export class DialogAction {
  Type!: Value<string>;
  SlotToElicit?: Value<string>;
  SuppressNextMessage?: Value<boolean>;
  constructor(properties: DialogAction) {
    Object.assign(this, properties);
  }
}

export class DialogCodeHookInvocationSetting {
  EnableCodeHookInvocation!: Value<boolean>;
  InvocationLabel?: Value<string>;
  IsActive!: Value<boolean>;
  PostCodeHookSpecification!: PostDialogCodeHookInvocationSpecification;
  constructor(properties: DialogCodeHookInvocationSetting) {
    Object.assign(this, properties);
  }
}

export class DialogCodeHookSetting {
  Enabled!: Value<boolean>;
  constructor(properties: DialogCodeHookSetting) {
    Object.assign(this, properties);
  }
}

export class DialogState {
  DialogAction?: DialogAction;
  SessionAttributes?: List<SessionAttribute>;
  Intent?: IntentOverride;
  constructor(properties: DialogState) {
    Object.assign(this, properties);
  }
}

export class ElicitationCodeHookInvocationSetting {
  EnableCodeHookInvocation!: Value<boolean>;
  InvocationLabel?: Value<string>;
  constructor(properties: ElicitationCodeHookInvocationSetting) {
    Object.assign(this, properties);
  }
}

export class ErrorLogSettings {
  Enabled!: Value<boolean>;
  constructor(properties: ErrorLogSettings) {
    Object.assign(this, properties);
  }
}

export class ExactResponseFields {
  QuestionField?: Value<string>;
  AnswerField?: Value<string>;
  constructor(properties: ExactResponseFields) {
    Object.assign(this, properties);
  }
}

export class ExternalSourceSetting {
  GrammarSlotTypeSetting?: GrammarSlotTypeSetting;
  constructor(properties: ExternalSourceSetting) {
    Object.assign(this, properties);
  }
}

export class FulfillmentCodeHookSetting {
  PostFulfillmentStatusSpecification?: PostFulfillmentStatusSpecification;
  FulfillmentUpdatesSpecification?: FulfillmentUpdatesSpecification;
  IsActive?: Value<boolean>;
  Enabled!: Value<boolean>;
  constructor(properties: FulfillmentCodeHookSetting) {
    Object.assign(this, properties);
  }
}

export class FulfillmentStartResponseSpecification {
  DelayInSeconds!: Value<number>;
  MessageGroups!: List<MessageGroup>;
  AllowInterrupt?: Value<boolean>;
  constructor(properties: FulfillmentStartResponseSpecification) {
    Object.assign(this, properties);
  }
}

export class FulfillmentUpdateResponseSpecification {
  MessageGroups!: List<MessageGroup>;
  AllowInterrupt?: Value<boolean>;
  FrequencyInSeconds!: Value<number>;
  constructor(properties: FulfillmentUpdateResponseSpecification) {
    Object.assign(this, properties);
  }
}

export class FulfillmentUpdatesSpecification {
  UpdateResponse?: FulfillmentUpdateResponseSpecification;
  Active!: Value<boolean>;
  TimeoutInSeconds?: Value<number>;
  StartResponse?: FulfillmentStartResponseSpecification;
  constructor(properties: FulfillmentUpdatesSpecification) {
    Object.assign(this, properties);
  }
}

export class GenerativeAISettings {
  RuntimeSettings?: RuntimeSettings;
  BuildtimeSettings?: BuildtimeSettings;
  constructor(properties: GenerativeAISettings) {
    Object.assign(this, properties);
  }
}

export class GrammarSlotTypeSetting {
  Source?: GrammarSlotTypeSource;
  constructor(properties: GrammarSlotTypeSetting) {
    Object.assign(this, properties);
  }
}

export class GrammarSlotTypeSource {
  KmsKeyArn?: Value<string>;
  S3BucketName!: Value<string>;
  S3ObjectKey!: Value<string>;
  constructor(properties: GrammarSlotTypeSource) {
    Object.assign(this, properties);
  }
}

export class ImageResponseCard {
  Subtitle?: Value<string>;
  Title!: Value<string>;
  ImageUrl?: Value<string>;
  Buttons?: List<Button>;
  constructor(properties: ImageResponseCard) {
    Object.assign(this, properties);
  }
}

export class InitialResponseSetting {
  CodeHook?: DialogCodeHookInvocationSetting;
  InitialResponse?: ResponseSpecification;
  Conditional?: ConditionalSpecification;
  NextStep?: DialogState;
  constructor(properties: InitialResponseSetting) {
    Object.assign(this, properties);
  }
}

export class InputContext {
  Name!: Value<string>;
  constructor(properties: InputContext) {
    Object.assign(this, properties);
  }
}

export class Intent {
  QInConnectIntentConfiguration?: QInConnectIntentConfiguration;
  Description?: Value<string>;
  ParentIntentSignature?: Value<string>;
  InitialResponseSetting?: InitialResponseSetting;
  BedrockAgentIntentConfiguration?: BedrockAgentIntentConfiguration;
  FulfillmentCodeHook?: FulfillmentCodeHookSetting;
  IntentConfirmationSetting?: IntentConfirmationSetting;
  Name!: Value<string>;
  Slots?: List<Slot>;
  QnAIntentConfiguration?: QnAIntentConfiguration;
  DialogCodeHook?: DialogCodeHookSetting;
  InputContexts?: List<InputContext>;
  KendraConfiguration?: KendraConfiguration;
  IntentClosingSetting?: IntentClosingSetting;
  OutputContexts?: List<OutputContext>;
  SlotPriorities?: List<SlotPriority>;
  SampleUtterances?: List<SampleUtterance>;
  constructor(properties: Intent) {
    Object.assign(this, properties);
  }
}

export class IntentClosingSetting {
  IsActive?: Value<boolean>;
  ClosingResponse?: ResponseSpecification;
  Conditional?: ConditionalSpecification;
  NextStep?: DialogState;
  constructor(properties: IntentClosingSetting) {
    Object.assign(this, properties);
  }
}

export class IntentConfirmationSetting {
  PromptSpecification!: PromptSpecification;
  ConfirmationResponse?: ResponseSpecification;
  DeclinationConditional?: ConditionalSpecification;
  FailureConditional?: ConditionalSpecification;
  ConfirmationConditional?: ConditionalSpecification;
  IsActive?: Value<boolean>;
  FailureResponse?: ResponseSpecification;
  CodeHook?: DialogCodeHookInvocationSetting;
  DeclinationNextStep?: DialogState;
  ElicitationCodeHook?: ElicitationCodeHookInvocationSetting;
  ConfirmationNextStep?: DialogState;
  FailureNextStep?: DialogState;
  DeclinationResponse?: ResponseSpecification;
  constructor(properties: IntentConfirmationSetting) {
    Object.assign(this, properties);
  }
}

export class IntentOverride {
  Slots?: List<SlotValueOverrideMap>;
  Name?: Value<string>;
  constructor(properties: IntentOverride) {
    Object.assign(this, properties);
  }
}

export class KendraConfiguration {
  QueryFilterString?: Value<string>;
  QueryFilterStringEnabled?: Value<boolean>;
  KendraIndex!: Value<string>;
  constructor(properties: KendraConfiguration) {
    Object.assign(this, properties);
  }
}

export class LambdaCodeHook {
  LambdaArn!: Value<string>;
  CodeHookInterfaceVersion!: Value<string>;
  constructor(properties: LambdaCodeHook) {
    Object.assign(this, properties);
  }
}

export class Message {
  CustomPayload?: CustomPayload;
  ImageResponseCard?: ImageResponseCard;
  PlainTextMessage?: PlainTextMessage;
  SSMLMessage?: SSMLMessage;
  constructor(properties: Message) {
    Object.assign(this, properties);
  }
}

export class MessageGroup {
  Message!: Message;
  Variations?: List<Message>;
  constructor(properties: MessageGroup) {
    Object.assign(this, properties);
  }
}

export class MultipleValuesSetting {
  AllowMultipleValues?: Value<boolean>;
  constructor(properties: MultipleValuesSetting) {
    Object.assign(this, properties);
  }
}

export class NluImprovementSpecification {
  Enabled!: Value<boolean>;
  constructor(properties: NluImprovementSpecification) {
    Object.assign(this, properties);
  }
}

export class ObfuscationSetting {
  ObfuscationSettingType!: Value<string>;
  constructor(properties: ObfuscationSetting) {
    Object.assign(this, properties);
  }
}

export class OpensearchConfiguration {
  IndexName?: Value<string>;
  DomainEndpoint?: Value<string>;
  ExactResponseFields?: ExactResponseFields;
  ExactResponse?: Value<boolean>;
  IncludeFields?: List<Value<string>>;
  constructor(properties: OpensearchConfiguration) {
    Object.assign(this, properties);
  }
}

export class OutputContext {
  TurnsToLive!: Value<number>;
  TimeToLiveInSeconds!: Value<number>;
  Name!: Value<string>;
  constructor(properties: OutputContext) {
    Object.assign(this, properties);
  }
}

export class PlainTextMessage {
  Value!: Value<string>;
  constructor(properties: PlainTextMessage) {
    Object.assign(this, properties);
  }
}

export class PostDialogCodeHookInvocationSpecification {
  SuccessResponse?: ResponseSpecification;
  FailureConditional?: ConditionalSpecification;
  TimeoutNextStep?: DialogState;
  SuccessConditional?: ConditionalSpecification;
  TimeoutResponse?: ResponseSpecification;
  SuccessNextStep?: DialogState;
  FailureResponse?: ResponseSpecification;
  FailureNextStep?: DialogState;
  TimeoutConditional?: ConditionalSpecification;
  constructor(properties: PostDialogCodeHookInvocationSpecification) {
    Object.assign(this, properties);
  }
}

export class PostFulfillmentStatusSpecification {
  SuccessResponse?: ResponseSpecification;
  FailureConditional?: ConditionalSpecification;
  TimeoutNextStep?: DialogState;
  SuccessConditional?: ConditionalSpecification;
  TimeoutResponse?: ResponseSpecification;
  SuccessNextStep?: DialogState;
  FailureResponse?: ResponseSpecification;
  FailureNextStep?: DialogState;
  TimeoutConditional?: ConditionalSpecification;
  constructor(properties: PostFulfillmentStatusSpecification) {
    Object.assign(this, properties);
  }
}

export class PromptAttemptSpecification {
  TextInputSpecification?: TextInputSpecification;
  AllowInterrupt?: Value<boolean>;
  AllowedInputTypes!: AllowedInputTypes;
  AudioAndDTMFInputSpecification?: AudioAndDTMFInputSpecification;
  constructor(properties: PromptAttemptSpecification) {
    Object.assign(this, properties);
  }
}

export class PromptSpecification {
  MaxRetries!: Value<number>;
  MessageGroupsList!: List<MessageGroup>;
  PromptAttemptsSpecification?: { [key: string]: PromptAttemptSpecification };
  AllowInterrupt?: Value<boolean>;
  MessageSelectionStrategy?: Value<string>;
  constructor(properties: PromptSpecification) {
    Object.assign(this, properties);
  }
}

export class QInConnectAssistantConfiguration {
  AssistantArn!: Value<string>;
  constructor(properties: QInConnectAssistantConfiguration) {
    Object.assign(this, properties);
  }
}

export class QInConnectIntentConfiguration {
  QInConnectAssistantConfiguration?: QInConnectAssistantConfiguration;
  constructor(properties: QInConnectIntentConfiguration) {
    Object.assign(this, properties);
  }
}

export class QnAIntentConfiguration {
  BedrockModelConfiguration!: BedrockModelSpecification;
  DataSourceConfiguration!: DataSourceConfiguration;
  constructor(properties: QnAIntentConfiguration) {
    Object.assign(this, properties);
  }
}

export class QnAKendraConfiguration {
  QueryFilterString?: Value<string>;
  QueryFilterStringEnabled!: Value<boolean>;
  KendraIndex!: Value<string>;
  ExactResponse!: Value<boolean>;
  constructor(properties: QnAKendraConfiguration) {
    Object.assign(this, properties);
  }
}

export class Replication {
  ReplicaRegions!: List<Value<string>>;
  constructor(properties: Replication) {
    Object.assign(this, properties);
  }
}

export class ResponseSpecification {
  MessageGroupsList!: List<MessageGroup>;
  AllowInterrupt?: Value<boolean>;
  constructor(properties: ResponseSpecification) {
    Object.assign(this, properties);
  }
}

export class RuntimeSettings {
  SlotResolutionImprovementSpecification?: SlotResolutionImprovementSpecification;
  NluImprovementSpecification?: NluImprovementSpecification;
  constructor(properties: RuntimeSettings) {
    Object.assign(this, properties);
  }
}

export class S3BucketLogDestination {
  KmsKeyArn?: Value<string>;
  LogPrefix!: Value<string>;
  S3BucketArn!: Value<string>;
  constructor(properties: S3BucketLogDestination) {
    Object.assign(this, properties);
  }
}

export class S3Location {
  S3ObjectVersion?: Value<string>;
  S3Bucket!: Value<string>;
  S3ObjectKey!: Value<string>;
  constructor(properties: S3Location) {
    Object.assign(this, properties);
  }
}

export class SSMLMessage {
  Value!: Value<string>;
  constructor(properties: SSMLMessage) {
    Object.assign(this, properties);
  }
}

export class SampleUtterance {
  Utterance!: Value<string>;
  constructor(properties: SampleUtterance) {
    Object.assign(this, properties);
  }
}

export class SampleUtteranceGenerationSpecification {
  Enabled!: Value<boolean>;
  BedrockModelSpecification?: BedrockModelSpecification;
  constructor(properties: SampleUtteranceGenerationSpecification) {
    Object.assign(this, properties);
  }
}

export class SampleValue {
  Value!: Value<string>;
  constructor(properties: SampleValue) {
    Object.assign(this, properties);
  }
}

export class SentimentAnalysisSettings {
  DetectSentiment!: Value<boolean>;
  constructor(properties: SentimentAnalysisSettings) {
    Object.assign(this, properties);
  }
}

export class SessionAttribute {
  Value?: Value<string>;
  Key!: Value<string>;
  constructor(properties: SessionAttribute) {
    Object.assign(this, properties);
  }
}

export class Slot {
  Description?: Value<string>;
  SlotTypeName!: Value<string>;
  ValueElicitationSetting!: SlotValueElicitationSetting;
  SubSlotSetting?: SubSlotSetting;
  ObfuscationSetting?: ObfuscationSetting;
  Name!: Value<string>;
  MultipleValuesSetting?: MultipleValuesSetting;
  constructor(properties: Slot) {
    Object.assign(this, properties);
  }
}

export class SlotCaptureSetting {
  CaptureConditional?: ConditionalSpecification;
  FailureConditional?: ConditionalSpecification;
  CaptureResponse?: ResponseSpecification;
  CaptureNextStep?: DialogState;
  FailureResponse?: ResponseSpecification;
  CodeHook?: DialogCodeHookInvocationSetting;
  FailureNextStep?: DialogState;
  ElicitationCodeHook?: ElicitationCodeHookInvocationSetting;
  constructor(properties: SlotCaptureSetting) {
    Object.assign(this, properties);
  }
}

export class SlotDefaultValue {
  DefaultValue!: Value<string>;
  constructor(properties: SlotDefaultValue) {
    Object.assign(this, properties);
  }
}

export class SlotDefaultValueSpecification {
  DefaultValueList!: List<SlotDefaultValue>;
  constructor(properties: SlotDefaultValueSpecification) {
    Object.assign(this, properties);
  }
}

export class SlotPriority {
  Priority!: Value<number>;
  SlotName!: Value<string>;
  constructor(properties: SlotPriority) {
    Object.assign(this, properties);
  }
}

export class SlotResolutionImprovementSpecification {
  Enabled!: Value<boolean>;
  BedrockModelSpecification?: BedrockModelSpecification;
  constructor(properties: SlotResolutionImprovementSpecification) {
    Object.assign(this, properties);
  }
}

export class SlotType {
  SlotTypeValues?: List<SlotTypeValue>;
  Description?: Value<string>;
  ParentSlotTypeSignature?: Value<string>;
  ValueSelectionSetting?: SlotValueSelectionSetting;
  CompositeSlotTypeSetting?: CompositeSlotTypeSetting;
  ExternalSourceSetting?: ExternalSourceSetting;
  Name!: Value<string>;
  constructor(properties: SlotType) {
    Object.assign(this, properties);
  }
}

export class SlotTypeValue {
  Synonyms?: List<SampleValue>;
  SampleValue!: SampleValue;
  constructor(properties: SlotTypeValue) {
    Object.assign(this, properties);
  }
}

export class SlotValue {
  InterpretedValue?: Value<string>;
  constructor(properties: SlotValue) {
    Object.assign(this, properties);
  }
}

export class SlotValueElicitationSetting {
  PromptSpecification?: PromptSpecification;
  WaitAndContinueSpecification?: WaitAndContinueSpecification;
  SlotConstraint!: Value<string>;
  SlotCaptureSetting?: SlotCaptureSetting;
  SampleUtterances?: List<SampleUtterance>;
  DefaultValueSpecification?: SlotDefaultValueSpecification;
  constructor(properties: SlotValueElicitationSetting) {
    Object.assign(this, properties);
  }
}

export class SlotValueOverride {
  Shape?: Value<string>;
  Value?: SlotValue;
  Values?: List<SlotValueOverride>;
  constructor(properties: SlotValueOverride) {
    Object.assign(this, properties);
  }
}

export class SlotValueOverrideMap {
  SlotName?: Value<string>;
  SlotValueOverride?: SlotValueOverride;
  constructor(properties: SlotValueOverrideMap) {
    Object.assign(this, properties);
  }
}

export class SlotValueRegexFilter {
  Pattern!: Value<string>;
  constructor(properties: SlotValueRegexFilter) {
    Object.assign(this, properties);
  }
}

export class SlotValueSelectionSetting {
  AdvancedRecognitionSetting?: AdvancedRecognitionSetting;
  RegexFilter?: SlotValueRegexFilter;
  ResolutionStrategy!: Value<string>;
  constructor(properties: SlotValueSelectionSetting) {
    Object.assign(this, properties);
  }
}

export class Specifications {
  SlotTypeName?: Value<string>;
  ValueElicitationSetting!: SubSlotValueElicitationSetting;
  SlotTypeId!: Value<string>;
  constructor(properties: Specifications) {
    Object.assign(this, properties);
  }
}

export class StillWaitingResponseSpecification {
  MessageGroupsList!: List<MessageGroup>;
  TimeoutInSeconds!: Value<number>;
  AllowInterrupt?: Value<boolean>;
  FrequencyInSeconds!: Value<number>;
  constructor(properties: StillWaitingResponseSpecification) {
    Object.assign(this, properties);
  }
}

export class SubSlotSetting {
  Expression?: Value<string>;
  SlotSpecifications?: { [key: string]: Specifications };
  constructor(properties: SubSlotSetting) {
    Object.assign(this, properties);
  }
}

export class SubSlotTypeComposition {
  SlotTypeName?: Value<string>;
  SlotTypeId!: Value<string>;
  Name!: Value<string>;
  constructor(properties: SubSlotTypeComposition) {
    Object.assign(this, properties);
  }
}

export class SubSlotValueElicitationSetting {
  PromptSpecification?: PromptSpecification;
  WaitAndContinueSpecification?: WaitAndContinueSpecification;
  SampleUtterances?: List<SampleUtterance>;
  DefaultValueSpecification?: SlotDefaultValueSpecification;
  constructor(properties: SubSlotValueElicitationSetting) {
    Object.assign(this, properties);
  }
}

export class TestBotAliasSettings {
  Description?: Value<string>;
  BotAliasLocaleSettings?: List<BotAliasLocaleSettingsItem>;
  ConversationLogSettings?: ConversationLogSettings;
  SentimentAnalysisSettings?: SentimentAnalysisSettings;
  constructor(properties: TestBotAliasSettings) {
    Object.assign(this, properties);
  }
}

export class TextInputSpecification {
  StartTimeoutMs!: Value<number>;
  constructor(properties: TextInputSpecification) {
    Object.assign(this, properties);
  }
}

export class TextLogDestination {
  CloudWatch!: CloudWatchLogGroupLogDestination;
  constructor(properties: TextLogDestination) {
    Object.assign(this, properties);
  }
}

export class TextLogSetting {
  Destination!: TextLogDestination;
  Enabled!: Value<boolean>;
  constructor(properties: TextLogSetting) {
    Object.assign(this, properties);
  }
}

export class VoiceSettings {
  VoiceId!: Value<string>;
  Engine?: Value<string>;
  constructor(properties: VoiceSettings) {
    Object.assign(this, properties);
  }
}

export class WaitAndContinueSpecification {
  WaitingResponse!: ResponseSpecification;
  StillWaitingResponse?: StillWaitingResponseSpecification;
  IsActive?: Value<boolean>;
  ContinueResponse!: ResponseSpecification;
  constructor(properties: WaitAndContinueSpecification) {
    Object.assign(this, properties);
  }
}
export interface BotProperties {
  Description?: Value<string>;
  ErrorLogSettings?: ErrorLogSettings;
  RoleArn: Value<string>;
  Name: Value<string>;
  BotTags?: List<ResourceTag>;
  TestBotAliasTags?: List<ResourceTag>;
  AutoBuildBotLocales?: Value<boolean>;
  BotLocales?: List<BotLocale>;
  IdleSessionTTLInSeconds: Value<number>;
  BotFileS3Location?: S3Location;
  Replication?: Replication;
  TestBotAliasSettings?: TestBotAliasSettings;
  DataPrivacy: DataPrivacy;
}
export default class Bot extends ResourceBase<BotProperties> {
  static AdvancedRecognitionSetting = AdvancedRecognitionSetting;
  static AllowedInputTypes = AllowedInputTypes;
  static AudioAndDTMFInputSpecification = AudioAndDTMFInputSpecification;
  static AudioLogDestination = AudioLogDestination;
  static AudioLogSetting = AudioLogSetting;
  static AudioSpecification = AudioSpecification;
  static BKBExactResponseFields = BKBExactResponseFields;
  static BedrockAgentConfiguration = BedrockAgentConfiguration;
  static BedrockAgentIntentConfiguration = BedrockAgentIntentConfiguration;
  static BedrockAgentIntentKnowledgeBaseConfiguration = BedrockAgentIntentKnowledgeBaseConfiguration;
  static BedrockGuardrailConfiguration = BedrockGuardrailConfiguration;
  static BedrockKnowledgeStoreConfiguration = BedrockKnowledgeStoreConfiguration;
  static BedrockModelSpecification = BedrockModelSpecification;
  static BotAliasLocaleSettings = BotAliasLocaleSettings;
  static BotAliasLocaleSettingsItem = BotAliasLocaleSettingsItem;
  static BotLocale = BotLocale;
  static BuildtimeSettings = BuildtimeSettings;
  static Button = Button;
  static CloudWatchLogGroupLogDestination = CloudWatchLogGroupLogDestination;
  static CodeHookSpecification = CodeHookSpecification;
  static CompositeSlotTypeSetting = CompositeSlotTypeSetting;
  static Condition = Condition;
  static ConditionalBranch = ConditionalBranch;
  static ConditionalSpecification = ConditionalSpecification;
  static ConversationLogSettings = ConversationLogSettings;
  static CustomPayload = CustomPayload;
  static CustomVocabulary = CustomVocabulary;
  static CustomVocabularyItem = CustomVocabularyItem;
  static DTMFSpecification = DTMFSpecification;
  static DataPrivacy = DataPrivacy;
  static DataSourceConfiguration = DataSourceConfiguration;
  static DefaultConditionalBranch = DefaultConditionalBranch;
  static DescriptiveBotBuilderSpecification = DescriptiveBotBuilderSpecification;
  static DialogAction = DialogAction;
  static DialogCodeHookInvocationSetting = DialogCodeHookInvocationSetting;
  static DialogCodeHookSetting = DialogCodeHookSetting;
  static DialogState = DialogState;
  static ElicitationCodeHookInvocationSetting = ElicitationCodeHookInvocationSetting;
  static ErrorLogSettings = ErrorLogSettings;
  static ExactResponseFields = ExactResponseFields;
  static ExternalSourceSetting = ExternalSourceSetting;
  static FulfillmentCodeHookSetting = FulfillmentCodeHookSetting;
  static FulfillmentStartResponseSpecification = FulfillmentStartResponseSpecification;
  static FulfillmentUpdateResponseSpecification = FulfillmentUpdateResponseSpecification;
  static FulfillmentUpdatesSpecification = FulfillmentUpdatesSpecification;
  static GenerativeAISettings = GenerativeAISettings;
  static GrammarSlotTypeSetting = GrammarSlotTypeSetting;
  static GrammarSlotTypeSource = GrammarSlotTypeSource;
  static ImageResponseCard = ImageResponseCard;
  static InitialResponseSetting = InitialResponseSetting;
  static InputContext = InputContext;
  static Intent = Intent;
  static IntentClosingSetting = IntentClosingSetting;
  static IntentConfirmationSetting = IntentConfirmationSetting;
  static IntentOverride = IntentOverride;
  static KendraConfiguration = KendraConfiguration;
  static LambdaCodeHook = LambdaCodeHook;
  static Message = Message;
  static MessageGroup = MessageGroup;
  static MultipleValuesSetting = MultipleValuesSetting;
  static NluImprovementSpecification = NluImprovementSpecification;
  static ObfuscationSetting = ObfuscationSetting;
  static OpensearchConfiguration = OpensearchConfiguration;
  static OutputContext = OutputContext;
  static PlainTextMessage = PlainTextMessage;
  static PostDialogCodeHookInvocationSpecification = PostDialogCodeHookInvocationSpecification;
  static PostFulfillmentStatusSpecification = PostFulfillmentStatusSpecification;
  static PromptAttemptSpecification = PromptAttemptSpecification;
  static PromptSpecification = PromptSpecification;
  static QInConnectAssistantConfiguration = QInConnectAssistantConfiguration;
  static QInConnectIntentConfiguration = QInConnectIntentConfiguration;
  static QnAIntentConfiguration = QnAIntentConfiguration;
  static QnAKendraConfiguration = QnAKendraConfiguration;
  static Replication = Replication;
  static ResponseSpecification = ResponseSpecification;
  static RuntimeSettings = RuntimeSettings;
  static S3BucketLogDestination = S3BucketLogDestination;
  static S3Location = S3Location;
  static SSMLMessage = SSMLMessage;
  static SampleUtterance = SampleUtterance;
  static SampleUtteranceGenerationSpecification = SampleUtteranceGenerationSpecification;
  static SampleValue = SampleValue;
  static SentimentAnalysisSettings = SentimentAnalysisSettings;
  static SessionAttribute = SessionAttribute;
  static Slot = Slot;
  static SlotCaptureSetting = SlotCaptureSetting;
  static SlotDefaultValue = SlotDefaultValue;
  static SlotDefaultValueSpecification = SlotDefaultValueSpecification;
  static SlotPriority = SlotPriority;
  static SlotResolutionImprovementSpecification = SlotResolutionImprovementSpecification;
  static SlotType = SlotType;
  static SlotTypeValue = SlotTypeValue;
  static SlotValue = SlotValue;
  static SlotValueElicitationSetting = SlotValueElicitationSetting;
  static SlotValueOverride = SlotValueOverride;
  static SlotValueOverrideMap = SlotValueOverrideMap;
  static SlotValueRegexFilter = SlotValueRegexFilter;
  static SlotValueSelectionSetting = SlotValueSelectionSetting;
  static Specifications = Specifications;
  static StillWaitingResponseSpecification = StillWaitingResponseSpecification;
  static SubSlotSetting = SubSlotSetting;
  static SubSlotTypeComposition = SubSlotTypeComposition;
  static SubSlotValueElicitationSetting = SubSlotValueElicitationSetting;
  static TestBotAliasSettings = TestBotAliasSettings;
  static TextInputSpecification = TextInputSpecification;
  static TextLogDestination = TextLogDestination;
  static TextLogSetting = TextLogSetting;
  static VoiceSettings = VoiceSettings;
  static WaitAndContinueSpecification = WaitAndContinueSpecification;
  constructor(properties: BotProperties) {
    super('AWS::Lex::Bot', properties);
  }
}
