import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AppIntegrationsConfiguration {
  ObjectFields?: List<Value<string>>;
  AppIntegrationArn!: Value<string>;
  constructor(properties: AppIntegrationsConfiguration) {
    Object.assign(this, properties);
  }
}

export class BedrockFoundationModelConfiguration {
  ModelArn!: Value<string>;
  ParsingPrompt?: ParsingPrompt;
  constructor(properties: BedrockFoundationModelConfiguration) {
    Object.assign(this, properties);
  }
}

export class ChunkingConfiguration {
  ChunkingStrategy!: Value<string>;
  FixedSizeChunkingConfiguration?: FixedSizeChunkingConfiguration;
  SemanticChunkingConfiguration?: SemanticChunkingConfiguration;
  HierarchicalChunkingConfiguration?: HierarchicalChunkingConfiguration;
  constructor(properties: ChunkingConfiguration) {
    Object.assign(this, properties);
  }
}

export class CrawlerLimits {
  RateLimit?: Value<number>;
  constructor(properties: CrawlerLimits) {
    Object.assign(this, properties);
  }
}

export class FixedSizeChunkingConfiguration {
  OverlapPercentage!: Value<number>;
  MaxTokens!: Value<number>;
  constructor(properties: FixedSizeChunkingConfiguration) {
    Object.assign(this, properties);
  }
}

export class HierarchicalChunkingConfiguration {
  OverlapTokens!: Value<number>;
  LevelConfigurations!: List<HierarchicalChunkingLevelConfiguration>;
  constructor(properties: HierarchicalChunkingConfiguration) {
    Object.assign(this, properties);
  }
}

export class HierarchicalChunkingLevelConfiguration {
  MaxTokens!: Value<number>;
  constructor(properties: HierarchicalChunkingLevelConfiguration) {
    Object.assign(this, properties);
  }
}

export class ManagedSourceConfiguration {
  WebCrawlerConfiguration!: WebCrawlerConfiguration;
  constructor(properties: ManagedSourceConfiguration) {
    Object.assign(this, properties);
  }
}

export class ParsingConfiguration {
  BedrockFoundationModelConfiguration?: BedrockFoundationModelConfiguration;
  ParsingStrategy!: Value<string>;
  constructor(properties: ParsingConfiguration) {
    Object.assign(this, properties);
  }
}

export class ParsingPrompt {
  ParsingPromptText!: Value<string>;
  constructor(properties: ParsingPrompt) {
    Object.assign(this, properties);
  }
}

export class RenderingConfiguration {
  TemplateUri?: Value<string>;
  constructor(properties: RenderingConfiguration) {
    Object.assign(this, properties);
  }
}

export class SeedUrl {
  Url?: Value<string>;
  constructor(properties: SeedUrl) {
    Object.assign(this, properties);
  }
}

export class SemanticChunkingConfiguration {
  BufferSize!: Value<number>;
  MaxTokens!: Value<number>;
  BreakpointPercentileThreshold!: Value<number>;
  constructor(properties: SemanticChunkingConfiguration) {
    Object.assign(this, properties);
  }
}

export class ServerSideEncryptionConfiguration {
  KmsKeyId?: Value<string>;
  constructor(properties: ServerSideEncryptionConfiguration) {
    Object.assign(this, properties);
  }
}

export class SourceConfiguration {
  AppIntegrations?: AppIntegrationsConfiguration;
  ManagedSourceConfiguration?: ManagedSourceConfiguration;
  constructor(properties: SourceConfiguration) {
    Object.assign(this, properties);
  }
}

export class UrlConfiguration {
  SeedUrls?: List<SeedUrl>;
  constructor(properties: UrlConfiguration) {
    Object.assign(this, properties);
  }
}

export class VectorIngestionConfiguration {
  ParsingConfiguration?: ParsingConfiguration;
  ChunkingConfiguration?: ChunkingConfiguration;
  constructor(properties: VectorIngestionConfiguration) {
    Object.assign(this, properties);
  }
}

export class WebCrawlerConfiguration {
  UrlConfiguration!: UrlConfiguration;
  InclusionFilters?: List<Value<string>>;
  CrawlerLimits?: CrawlerLimits;
  ExclusionFilters?: List<Value<string>>;
  Scope?: Value<string>;
  constructor(properties: WebCrawlerConfiguration) {
    Object.assign(this, properties);
  }
}
export interface KnowledgeBaseProperties {
  Description?: Value<string>;
  KnowledgeBaseType: Value<string>;
  SourceConfiguration?: SourceConfiguration;
  ServerSideEncryptionConfiguration?: ServerSideEncryptionConfiguration;
  VectorIngestionConfiguration?: VectorIngestionConfiguration;
  RenderingConfiguration?: RenderingConfiguration;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
}
export default class KnowledgeBase extends ResourceBase<KnowledgeBaseProperties> {
  static AppIntegrationsConfiguration = AppIntegrationsConfiguration;
  static BedrockFoundationModelConfiguration = BedrockFoundationModelConfiguration;
  static ChunkingConfiguration = ChunkingConfiguration;
  static CrawlerLimits = CrawlerLimits;
  static FixedSizeChunkingConfiguration = FixedSizeChunkingConfiguration;
  static HierarchicalChunkingConfiguration = HierarchicalChunkingConfiguration;
  static HierarchicalChunkingLevelConfiguration = HierarchicalChunkingLevelConfiguration;
  static ManagedSourceConfiguration = ManagedSourceConfiguration;
  static ParsingConfiguration = ParsingConfiguration;
  static ParsingPrompt = ParsingPrompt;
  static RenderingConfiguration = RenderingConfiguration;
  static SeedUrl = SeedUrl;
  static SemanticChunkingConfiguration = SemanticChunkingConfiguration;
  static ServerSideEncryptionConfiguration = ServerSideEncryptionConfiguration;
  static SourceConfiguration = SourceConfiguration;
  static UrlConfiguration = UrlConfiguration;
  static VectorIngestionConfiguration = VectorIngestionConfiguration;
  static WebCrawlerConfiguration = WebCrawlerConfiguration;
  constructor(properties: KnowledgeBaseProperties) {
    super('AWS::Wisdom::KnowledgeBase', properties);
  }
}
