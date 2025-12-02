import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class CachePointBlock {
  Type!: Value<string>;
  constructor(properties: CachePointBlock) {
    Object.assign(this, properties);
  }
}

export class ChatPromptTemplateConfiguration {
  Messages!: List<Message>;
  InputVariables?: List<PromptInputVariable>;
  ToolConfiguration?: ToolConfiguration;
  System?: List<SystemContentBlock>;
  constructor(properties: ChatPromptTemplateConfiguration) {
    Object.assign(this, properties);
  }
}

export class ContentBlock {
  CachePoint?: CachePointBlock;
  Text?: Value<string>;
  constructor(properties: ContentBlock) {
    Object.assign(this, properties);
  }
}

export class Message {
  Role!: Value<string>;
  Content!: List<ContentBlock>;
  constructor(properties: Message) {
    Object.assign(this, properties);
  }
}

export class PromptAgentResource {
  AgentIdentifier!: Value<string>;
  constructor(properties: PromptAgentResource) {
    Object.assign(this, properties);
  }
}

export class PromptGenAiResource {
  Agent!: PromptAgentResource;
  constructor(properties: PromptGenAiResource) {
    Object.assign(this, properties);
  }
}

export class PromptInferenceConfiguration {
  Text!: PromptModelInferenceConfiguration;
  constructor(properties: PromptInferenceConfiguration) {
    Object.assign(this, properties);
  }
}

export class PromptInputVariable {
  Name?: Value<string>;
  constructor(properties: PromptInputVariable) {
    Object.assign(this, properties);
  }
}

export class PromptMetadataEntry {
  Value!: Value<string>;
  Key!: Value<string>;
  constructor(properties: PromptMetadataEntry) {
    Object.assign(this, properties);
  }
}

export class PromptModelInferenceConfiguration {
  Temperature?: Value<number>;
  StopSequences?: List<Value<string>>;
  MaxTokens?: Value<number>;
  TopP?: Value<number>;
  constructor(properties: PromptModelInferenceConfiguration) {
    Object.assign(this, properties);
  }
}

export class PromptTemplateConfiguration {
  Chat?: ChatPromptTemplateConfiguration;
  Text?: TextPromptTemplateConfiguration;
  constructor(properties: PromptTemplateConfiguration) {
    Object.assign(this, properties);
  }
}

export class PromptVariant {
  AdditionalModelRequestFields?: { [key: string]: any };
  InferenceConfiguration?: PromptInferenceConfiguration;
  Metadata?: List<PromptMetadataEntry>;
  GenAiResource?: PromptGenAiResource;
  TemplateConfiguration!: PromptTemplateConfiguration;
  TemplateType!: Value<string>;
  ModelId?: Value<string>;
  Name!: Value<string>;
  constructor(properties: PromptVariant) {
    Object.assign(this, properties);
  }
}

export class SpecificToolChoice {
  Name!: Value<string>;
  constructor(properties: SpecificToolChoice) {
    Object.assign(this, properties);
  }
}

export class SystemContentBlock {
  CachePoint?: CachePointBlock;
  Text?: Value<string>;
  constructor(properties: SystemContentBlock) {
    Object.assign(this, properties);
  }
}

export class TextPromptTemplateConfiguration {
  InputVariables?: List<PromptInputVariable>;
  TextS3Location?: TextS3Location;
  CachePoint?: CachePointBlock;
  Text?: Value<string>;
  constructor(properties: TextPromptTemplateConfiguration) {
    Object.assign(this, properties);
  }
}

export class TextS3Location {
  Bucket!: Value<string>;
  Version?: Value<string>;
  Key!: Value<string>;
  constructor(properties: TextS3Location) {
    Object.assign(this, properties);
  }
}

export class Tool {
  CachePoint?: CachePointBlock;
  ToolSpec?: ToolSpecification;
  constructor(properties: Tool) {
    Object.assign(this, properties);
  }
}

export class ToolChoice {
  Auto?: { [key: string]: any };
  Any?: { [key: string]: any };
  Tool?: SpecificToolChoice;
  constructor(properties: ToolChoice) {
    Object.assign(this, properties);
  }
}

export class ToolConfiguration {
  ToolChoice?: ToolChoice;
  Tools!: List<Tool>;
  constructor(properties: ToolConfiguration) {
    Object.assign(this, properties);
  }
}

export class ToolInputSchema {
  Json!: { [key: string]: any };
  constructor(properties: ToolInputSchema) {
    Object.assign(this, properties);
  }
}

export class ToolSpecification {
  Description?: Value<string>;
  InputSchema!: ToolInputSchema;
  Name!: Value<string>;
  constructor(properties: ToolSpecification) {
    Object.assign(this, properties);
  }
}
export interface PromptProperties {
  Variants?: List<PromptVariant>;
  Description?: Value<string>;
  CustomerEncryptionKeyArn?: Value<string>;
  DefaultVariant?: Value<string>;
  Tags?: { [key: string]: Value<string> };
  Name: Value<string>;
}
export default class Prompt extends ResourceBase<PromptProperties> {
  static CachePointBlock = CachePointBlock;
  static ChatPromptTemplateConfiguration = ChatPromptTemplateConfiguration;
  static ContentBlock = ContentBlock;
  static Message = Message;
  static PromptAgentResource = PromptAgentResource;
  static PromptGenAiResource = PromptGenAiResource;
  static PromptInferenceConfiguration = PromptInferenceConfiguration;
  static PromptInputVariable = PromptInputVariable;
  static PromptMetadataEntry = PromptMetadataEntry;
  static PromptModelInferenceConfiguration = PromptModelInferenceConfiguration;
  static PromptTemplateConfiguration = PromptTemplateConfiguration;
  static PromptVariant = PromptVariant;
  static SpecificToolChoice = SpecificToolChoice;
  static SystemContentBlock = SystemContentBlock;
  static TextPromptTemplateConfiguration = TextPromptTemplateConfiguration;
  static TextS3Location = TextS3Location;
  static Tool = Tool;
  static ToolChoice = ToolChoice;
  static ToolConfiguration = ToolConfiguration;
  static ToolInputSchema = ToolInputSchema;
  static ToolSpecification = ToolSpecification;
  constructor(properties: PromptProperties) {
    super('AWS::Bedrock::Prompt', properties);
  }
}
