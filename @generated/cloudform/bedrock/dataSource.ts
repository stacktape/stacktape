import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class BedrockDataAutomationConfiguration {
  ParsingModality?: Value<string>;
  constructor(properties: BedrockDataAutomationConfiguration) {
    Object.assign(this, properties);
  }
}

export class BedrockFoundationModelConfiguration {
  ModelArn!: Value<string>;
  ParsingModality?: Value<string>;
  ParsingPrompt?: ParsingPrompt;
  constructor(properties: BedrockFoundationModelConfiguration) {
    Object.assign(this, properties);
  }
}

export class BedrockFoundationModelContextEnrichmentConfiguration {
  EnrichmentStrategyConfiguration!: EnrichmentStrategyConfiguration;
  ModelArn!: Value<string>;
  constructor(properties: BedrockFoundationModelContextEnrichmentConfiguration) {
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

export class ConfluenceCrawlerConfiguration {
  FilterConfiguration?: CrawlFilterConfiguration;
  constructor(properties: ConfluenceCrawlerConfiguration) {
    Object.assign(this, properties);
  }
}

export class ConfluenceDataSourceConfiguration {
  SourceConfiguration!: ConfluenceSourceConfiguration;
  CrawlerConfiguration?: ConfluenceCrawlerConfiguration;
  constructor(properties: ConfluenceDataSourceConfiguration) {
    Object.assign(this, properties);
  }
}

export class ConfluenceSourceConfiguration {
  HostUrl!: Value<string>;
  HostType!: Value<string>;
  AuthType!: Value<string>;
  CredentialsSecretArn!: Value<string>;
  constructor(properties: ConfluenceSourceConfiguration) {
    Object.assign(this, properties);
  }
}

export class ContextEnrichmentConfiguration {
  Type!: Value<string>;
  BedrockFoundationModelConfiguration?: BedrockFoundationModelContextEnrichmentConfiguration;
  constructor(properties: ContextEnrichmentConfiguration) {
    Object.assign(this, properties);
  }
}

export class CrawlFilterConfiguration {
  Type!: Value<string>;
  PatternObjectFilter?: PatternObjectFilterConfiguration;
  constructor(properties: CrawlFilterConfiguration) {
    Object.assign(this, properties);
  }
}

export class CustomTransformationConfiguration {
  IntermediateStorage!: IntermediateStorage;
  Transformations!: List<Transformation>;
  constructor(properties: CustomTransformationConfiguration) {
    Object.assign(this, properties);
  }
}

export class DataSourceConfiguration {
  Type!: Value<string>;
  S3Configuration?: S3DataSourceConfiguration;
  SalesforceConfiguration?: SalesforceDataSourceConfiguration;
  ConfluenceConfiguration?: ConfluenceDataSourceConfiguration;
  SharePointConfiguration?: SharePointDataSourceConfiguration;
  WebConfiguration?: WebDataSourceConfiguration;
  constructor(properties: DataSourceConfiguration) {
    Object.assign(this, properties);
  }
}

export class EnrichmentStrategyConfiguration {
  Method!: Value<string>;
  constructor(properties: EnrichmentStrategyConfiguration) {
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

export class IntermediateStorage {
  S3Location!: S3Location;
  constructor(properties: IntermediateStorage) {
    Object.assign(this, properties);
  }
}

export class ParsingConfiguration {
  BedrockDataAutomationConfiguration?: BedrockDataAutomationConfiguration;
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

export class PatternObjectFilter {
  ObjectType!: Value<string>;
  InclusionFilters?: List<Value<string>>;
  ExclusionFilters?: List<Value<string>>;
  constructor(properties: PatternObjectFilter) {
    Object.assign(this, properties);
  }
}

export class PatternObjectFilterConfiguration {
  Filters!: List<PatternObjectFilter>;
  constructor(properties: PatternObjectFilterConfiguration) {
    Object.assign(this, properties);
  }
}

export class S3DataSourceConfiguration {
  BucketArn!: Value<string>;
  BucketOwnerAccountId?: Value<string>;
  InclusionPrefixes?: List<Value<string>>;
  constructor(properties: S3DataSourceConfiguration) {
    Object.assign(this, properties);
  }
}

export class S3Location {
  URI!: Value<string>;
  constructor(properties: S3Location) {
    Object.assign(this, properties);
  }
}

export class SalesforceCrawlerConfiguration {
  FilterConfiguration?: CrawlFilterConfiguration;
  constructor(properties: SalesforceCrawlerConfiguration) {
    Object.assign(this, properties);
  }
}

export class SalesforceDataSourceConfiguration {
  SourceConfiguration!: SalesforceSourceConfiguration;
  CrawlerConfiguration?: SalesforceCrawlerConfiguration;
  constructor(properties: SalesforceDataSourceConfiguration) {
    Object.assign(this, properties);
  }
}

export class SalesforceSourceConfiguration {
  HostUrl!: Value<string>;
  AuthType!: Value<string>;
  CredentialsSecretArn!: Value<string>;
  constructor(properties: SalesforceSourceConfiguration) {
    Object.assign(this, properties);
  }
}

export class SeedUrl {
  Url!: Value<string>;
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
  KmsKeyArn?: Value<string>;
  constructor(properties: ServerSideEncryptionConfiguration) {
    Object.assign(this, properties);
  }
}

export class SharePointCrawlerConfiguration {
  FilterConfiguration?: CrawlFilterConfiguration;
  constructor(properties: SharePointCrawlerConfiguration) {
    Object.assign(this, properties);
  }
}

export class SharePointDataSourceConfiguration {
  SourceConfiguration!: SharePointSourceConfiguration;
  CrawlerConfiguration?: SharePointCrawlerConfiguration;
  constructor(properties: SharePointDataSourceConfiguration) {
    Object.assign(this, properties);
  }
}

export class SharePointSourceConfiguration {
  SiteUrls!: List<Value<string>>;
  HostType!: Value<string>;
  TenantId?: Value<string>;
  AuthType!: Value<string>;
  CredentialsSecretArn!: Value<string>;
  Domain!: Value<string>;
  constructor(properties: SharePointSourceConfiguration) {
    Object.assign(this, properties);
  }
}

export class Transformation {
  StepToApply!: Value<string>;
  TransformationFunction!: TransformationFunction;
  constructor(properties: Transformation) {
    Object.assign(this, properties);
  }
}

export class TransformationFunction {
  TransformationLambdaConfiguration!: TransformationLambdaConfiguration;
  constructor(properties: TransformationFunction) {
    Object.assign(this, properties);
  }
}

export class TransformationLambdaConfiguration {
  LambdaArn!: Value<string>;
  constructor(properties: TransformationLambdaConfiguration) {
    Object.assign(this, properties);
  }
}

export class UrlConfiguration {
  SeedUrls!: List<SeedUrl>;
  constructor(properties: UrlConfiguration) {
    Object.assign(this, properties);
  }
}

export class VectorIngestionConfiguration {
  ParsingConfiguration?: ParsingConfiguration;
  ContextEnrichmentConfiguration?: ContextEnrichmentConfiguration;
  CustomTransformationConfiguration?: CustomTransformationConfiguration;
  ChunkingConfiguration?: ChunkingConfiguration;
  constructor(properties: VectorIngestionConfiguration) {
    Object.assign(this, properties);
  }
}

export class WebCrawlerConfiguration {
  InclusionFilters?: List<Value<string>>;
  UserAgentHeader?: Value<string>;
  CrawlerLimits?: WebCrawlerLimits;
  ExclusionFilters?: List<Value<string>>;
  Scope?: Value<string>;
  UserAgent?: Value<string>;
  constructor(properties: WebCrawlerConfiguration) {
    Object.assign(this, properties);
  }
}

export class WebCrawlerLimits {
  RateLimit?: Value<number>;
  MaxPages?: Value<number>;
  constructor(properties: WebCrawlerLimits) {
    Object.assign(this, properties);
  }
}

export class WebDataSourceConfiguration {
  SourceConfiguration!: WebSourceConfiguration;
  CrawlerConfiguration?: WebCrawlerConfiguration;
  constructor(properties: WebDataSourceConfiguration) {
    Object.assign(this, properties);
  }
}

export class WebSourceConfiguration {
  UrlConfiguration!: UrlConfiguration;
  constructor(properties: WebSourceConfiguration) {
    Object.assign(this, properties);
  }
}
export interface DataSourceProperties {
  DataDeletionPolicy?: Value<string>;
  Description?: Value<string>;
  KnowledgeBaseId: Value<string>;
  ServerSideEncryptionConfiguration?: ServerSideEncryptionConfiguration;
  VectorIngestionConfiguration?: VectorIngestionConfiguration;
  DataSourceConfiguration: DataSourceConfiguration;
  Name: Value<string>;
}
export default class DataSource extends ResourceBase<DataSourceProperties> {
  static BedrockDataAutomationConfiguration = BedrockDataAutomationConfiguration;
  static BedrockFoundationModelConfiguration = BedrockFoundationModelConfiguration;
  static BedrockFoundationModelContextEnrichmentConfiguration = BedrockFoundationModelContextEnrichmentConfiguration;
  static ChunkingConfiguration = ChunkingConfiguration;
  static ConfluenceCrawlerConfiguration = ConfluenceCrawlerConfiguration;
  static ConfluenceDataSourceConfiguration = ConfluenceDataSourceConfiguration;
  static ConfluenceSourceConfiguration = ConfluenceSourceConfiguration;
  static ContextEnrichmentConfiguration = ContextEnrichmentConfiguration;
  static CrawlFilterConfiguration = CrawlFilterConfiguration;
  static CustomTransformationConfiguration = CustomTransformationConfiguration;
  static DataSourceConfiguration = DataSourceConfiguration;
  static EnrichmentStrategyConfiguration = EnrichmentStrategyConfiguration;
  static FixedSizeChunkingConfiguration = FixedSizeChunkingConfiguration;
  static HierarchicalChunkingConfiguration = HierarchicalChunkingConfiguration;
  static HierarchicalChunkingLevelConfiguration = HierarchicalChunkingLevelConfiguration;
  static IntermediateStorage = IntermediateStorage;
  static ParsingConfiguration = ParsingConfiguration;
  static ParsingPrompt = ParsingPrompt;
  static PatternObjectFilter = PatternObjectFilter;
  static PatternObjectFilterConfiguration = PatternObjectFilterConfiguration;
  static S3DataSourceConfiguration = S3DataSourceConfiguration;
  static S3Location = S3Location;
  static SalesforceCrawlerConfiguration = SalesforceCrawlerConfiguration;
  static SalesforceDataSourceConfiguration = SalesforceDataSourceConfiguration;
  static SalesforceSourceConfiguration = SalesforceSourceConfiguration;
  static SeedUrl = SeedUrl;
  static SemanticChunkingConfiguration = SemanticChunkingConfiguration;
  static ServerSideEncryptionConfiguration = ServerSideEncryptionConfiguration;
  static SharePointCrawlerConfiguration = SharePointCrawlerConfiguration;
  static SharePointDataSourceConfiguration = SharePointDataSourceConfiguration;
  static SharePointSourceConfiguration = SharePointSourceConfiguration;
  static Transformation = Transformation;
  static TransformationFunction = TransformationFunction;
  static TransformationLambdaConfiguration = TransformationLambdaConfiguration;
  static UrlConfiguration = UrlConfiguration;
  static VectorIngestionConfiguration = VectorIngestionConfiguration;
  static WebCrawlerConfiguration = WebCrawlerConfiguration;
  static WebCrawlerLimits = WebCrawlerLimits;
  static WebDataSourceConfiguration = WebDataSourceConfiguration;
  static WebSourceConfiguration = WebSourceConfiguration;
  constructor(properties: DataSourceProperties) {
    super('AWS::Bedrock::DataSource', properties);
  }
}
