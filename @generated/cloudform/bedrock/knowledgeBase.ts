import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class BedrockEmbeddingModelConfiguration {
  EmbeddingDataType?: Value<string>;
  Dimensions?: Value<number>;
  constructor(properties: BedrockEmbeddingModelConfiguration) {
    Object.assign(this, properties);
  }
}

export class CuratedQuery {
  NaturalLanguage!: Value<string>;
  Sql!: Value<string>;
  constructor(properties: CuratedQuery) {
    Object.assign(this, properties);
  }
}

export class EmbeddingModelConfiguration {
  BedrockEmbeddingModelConfiguration?: BedrockEmbeddingModelConfiguration;
  constructor(properties: EmbeddingModelConfiguration) {
    Object.assign(this, properties);
  }
}

export class KendraKnowledgeBaseConfiguration {
  KendraIndexArn!: Value<string>;
  constructor(properties: KendraKnowledgeBaseConfiguration) {
    Object.assign(this, properties);
  }
}

export class KnowledgeBaseConfiguration {
  Type!: Value<string>;
  SqlKnowledgeBaseConfiguration?: SqlKnowledgeBaseConfiguration;
  KendraKnowledgeBaseConfiguration?: KendraKnowledgeBaseConfiguration;
  VectorKnowledgeBaseConfiguration?: VectorKnowledgeBaseConfiguration;
  constructor(properties: KnowledgeBaseConfiguration) {
    Object.assign(this, properties);
  }
}

export class MongoDbAtlasConfiguration {
  Endpoint!: Value<string>;
  CollectionName!: Value<string>;
  VectorIndexName!: Value<string>;
  FieldMapping!: MongoDbAtlasFieldMapping;
  DatabaseName!: Value<string>;
  EndpointServiceName?: Value<string>;
  CredentialsSecretArn!: Value<string>;
  TextIndexName?: Value<string>;
  constructor(properties: MongoDbAtlasConfiguration) {
    Object.assign(this, properties);
  }
}

export class MongoDbAtlasFieldMapping {
  VectorField!: Value<string>;
  TextField!: Value<string>;
  MetadataField!: Value<string>;
  constructor(properties: MongoDbAtlasFieldMapping) {
    Object.assign(this, properties);
  }
}

export class NeptuneAnalyticsConfiguration {
  GraphArn!: Value<string>;
  FieldMapping!: NeptuneAnalyticsFieldMapping;
  constructor(properties: NeptuneAnalyticsConfiguration) {
    Object.assign(this, properties);
  }
}

export class NeptuneAnalyticsFieldMapping {
  TextField!: Value<string>;
  MetadataField!: Value<string>;
  constructor(properties: NeptuneAnalyticsFieldMapping) {
    Object.assign(this, properties);
  }
}

export class OpenSearchManagedClusterConfiguration {
  DomainEndpoint!: Value<string>;
  VectorIndexName!: Value<string>;
  FieldMapping!: OpenSearchManagedClusterFieldMapping;
  DomainArn!: Value<string>;
  constructor(properties: OpenSearchManagedClusterConfiguration) {
    Object.assign(this, properties);
  }
}

export class OpenSearchManagedClusterFieldMapping {
  VectorField!: Value<string>;
  TextField!: Value<string>;
  MetadataField!: Value<string>;
  constructor(properties: OpenSearchManagedClusterFieldMapping) {
    Object.assign(this, properties);
  }
}

export class OpenSearchServerlessConfiguration {
  CollectionArn!: Value<string>;
  VectorIndexName!: Value<string>;
  FieldMapping!: OpenSearchServerlessFieldMapping;
  constructor(properties: OpenSearchServerlessConfiguration) {
    Object.assign(this, properties);
  }
}

export class OpenSearchServerlessFieldMapping {
  VectorField!: Value<string>;
  TextField!: Value<string>;
  MetadataField!: Value<string>;
  constructor(properties: OpenSearchServerlessFieldMapping) {
    Object.assign(this, properties);
  }
}

export class PineconeConfiguration {
  FieldMapping!: PineconeFieldMapping;
  CredentialsSecretArn!: Value<string>;
  ConnectionString!: Value<string>;
  Namespace?: Value<string>;
  constructor(properties: PineconeConfiguration) {
    Object.assign(this, properties);
  }
}

export class PineconeFieldMapping {
  TextField!: Value<string>;
  MetadataField!: Value<string>;
  constructor(properties: PineconeFieldMapping) {
    Object.assign(this, properties);
  }
}

export class QueryGenerationColumn {
  Description?: Value<string>;
  Inclusion?: Value<string>;
  Name?: Value<string>;
  constructor(properties: QueryGenerationColumn) {
    Object.assign(this, properties);
  }
}

export class QueryGenerationConfiguration {
  GenerationContext?: QueryGenerationContext;
  ExecutionTimeoutSeconds?: Value<number>;
  constructor(properties: QueryGenerationConfiguration) {
    Object.assign(this, properties);
  }
}

export class QueryGenerationContext {
  CuratedQueries?: List<CuratedQuery>;
  Tables?: List<QueryGenerationTable>;
  constructor(properties: QueryGenerationContext) {
    Object.assign(this, properties);
  }
}

export class QueryGenerationTable {
  Description?: Value<string>;
  Inclusion?: Value<string>;
  Columns?: List<QueryGenerationColumn>;
  Name!: Value<string>;
  constructor(properties: QueryGenerationTable) {
    Object.assign(this, properties);
  }
}

export class RdsConfiguration {
  ResourceArn!: Value<string>;
  TableName!: Value<string>;
  FieldMapping!: RdsFieldMapping;
  DatabaseName!: Value<string>;
  CredentialsSecretArn!: Value<string>;
  constructor(properties: RdsConfiguration) {
    Object.assign(this, properties);
  }
}

export class RdsFieldMapping {
  PrimaryKeyField!: Value<string>;
  VectorField!: Value<string>;
  TextField!: Value<string>;
  CustomMetadataField?: Value<string>;
  MetadataField!: Value<string>;
  constructor(properties: RdsFieldMapping) {
    Object.assign(this, properties);
  }
}

export class RedshiftConfiguration {
  QueryEngineConfiguration!: RedshiftQueryEngineConfiguration;
  StorageConfigurations!: List<RedshiftQueryEngineStorageConfiguration>;
  QueryGenerationConfiguration?: QueryGenerationConfiguration;
  constructor(properties: RedshiftConfiguration) {
    Object.assign(this, properties);
  }
}

export class RedshiftProvisionedAuthConfiguration {
  Type!: Value<string>;
  DatabaseUser?: Value<string>;
  UsernamePasswordSecretArn?: Value<string>;
  constructor(properties: RedshiftProvisionedAuthConfiguration) {
    Object.assign(this, properties);
  }
}

export class RedshiftProvisionedConfiguration {
  AuthConfiguration!: RedshiftProvisionedAuthConfiguration;
  ClusterIdentifier!: Value<string>;
  constructor(properties: RedshiftProvisionedConfiguration) {
    Object.assign(this, properties);
  }
}

export class RedshiftQueryEngineAwsDataCatalogStorageConfiguration {
  TableNames!: List<Value<string>>;
  constructor(properties: RedshiftQueryEngineAwsDataCatalogStorageConfiguration) {
    Object.assign(this, properties);
  }
}

export class RedshiftQueryEngineConfiguration {
  Type!: Value<string>;
  ProvisionedConfiguration?: RedshiftProvisionedConfiguration;
  ServerlessConfiguration?: RedshiftServerlessConfiguration;
  constructor(properties: RedshiftQueryEngineConfiguration) {
    Object.assign(this, properties);
  }
}

export class RedshiftQueryEngineRedshiftStorageConfiguration {
  DatabaseName!: Value<string>;
  constructor(properties: RedshiftQueryEngineRedshiftStorageConfiguration) {
    Object.assign(this, properties);
  }
}

export class RedshiftQueryEngineStorageConfiguration {
  Type!: Value<string>;
  RedshiftConfiguration?: RedshiftQueryEngineRedshiftStorageConfiguration;
  AwsDataCatalogConfiguration?: RedshiftQueryEngineAwsDataCatalogStorageConfiguration;
  constructor(properties: RedshiftQueryEngineStorageConfiguration) {
    Object.assign(this, properties);
  }
}

export class RedshiftServerlessAuthConfiguration {
  Type!: Value<string>;
  UsernamePasswordSecretArn?: Value<string>;
  constructor(properties: RedshiftServerlessAuthConfiguration) {
    Object.assign(this, properties);
  }
}

export class RedshiftServerlessConfiguration {
  WorkgroupArn!: Value<string>;
  AuthConfiguration!: RedshiftServerlessAuthConfiguration;
  constructor(properties: RedshiftServerlessConfiguration) {
    Object.assign(this, properties);
  }
}

export class S3Location {
  URI!: Value<string>;
  constructor(properties: S3Location) {
    Object.assign(this, properties);
  }
}

export class SqlKnowledgeBaseConfiguration {
  Type!: Value<string>;
  RedshiftConfiguration?: RedshiftConfiguration;
  constructor(properties: SqlKnowledgeBaseConfiguration) {
    Object.assign(this, properties);
  }
}

export class StorageConfiguration {
  OpensearchManagedClusterConfiguration?: OpenSearchManagedClusterConfiguration;
  OpensearchServerlessConfiguration?: OpenSearchServerlessConfiguration;
  NeptuneAnalyticsConfiguration?: NeptuneAnalyticsConfiguration;
  Type!: Value<string>;
  MongoDbAtlasConfiguration?: MongoDbAtlasConfiguration;
  RdsConfiguration?: RdsConfiguration;
  PineconeConfiguration?: PineconeConfiguration;
  constructor(properties: StorageConfiguration) {
    Object.assign(this, properties);
  }
}

export class SupplementalDataStorageConfiguration {
  SupplementalDataStorageLocations!: List<SupplementalDataStorageLocation>;
  constructor(properties: SupplementalDataStorageConfiguration) {
    Object.assign(this, properties);
  }
}

export class SupplementalDataStorageLocation {
  SupplementalDataStorageLocationType!: Value<string>;
  S3Location?: S3Location;
  constructor(properties: SupplementalDataStorageLocation) {
    Object.assign(this, properties);
  }
}

export class VectorKnowledgeBaseConfiguration {
  EmbeddingModelConfiguration?: EmbeddingModelConfiguration;
  EmbeddingModelArn!: Value<string>;
  SupplementalDataStorageConfiguration?: SupplementalDataStorageConfiguration;
  constructor(properties: VectorKnowledgeBaseConfiguration) {
    Object.assign(this, properties);
  }
}
export interface KnowledgeBaseProperties {
  Description?: Value<string>;
  KnowledgeBaseConfiguration: KnowledgeBaseConfiguration;
  StorageConfiguration?: StorageConfiguration;
  RoleArn: Value<string>;
  Tags?: { [key: string]: Value<string> };
  Name: Value<string>;
}
export default class KnowledgeBase extends ResourceBase<KnowledgeBaseProperties> {
  static BedrockEmbeddingModelConfiguration = BedrockEmbeddingModelConfiguration;
  static CuratedQuery = CuratedQuery;
  static EmbeddingModelConfiguration = EmbeddingModelConfiguration;
  static KendraKnowledgeBaseConfiguration = KendraKnowledgeBaseConfiguration;
  static KnowledgeBaseConfiguration = KnowledgeBaseConfiguration;
  static MongoDbAtlasConfiguration = MongoDbAtlasConfiguration;
  static MongoDbAtlasFieldMapping = MongoDbAtlasFieldMapping;
  static NeptuneAnalyticsConfiguration = NeptuneAnalyticsConfiguration;
  static NeptuneAnalyticsFieldMapping = NeptuneAnalyticsFieldMapping;
  static OpenSearchManagedClusterConfiguration = OpenSearchManagedClusterConfiguration;
  static OpenSearchManagedClusterFieldMapping = OpenSearchManagedClusterFieldMapping;
  static OpenSearchServerlessConfiguration = OpenSearchServerlessConfiguration;
  static OpenSearchServerlessFieldMapping = OpenSearchServerlessFieldMapping;
  static PineconeConfiguration = PineconeConfiguration;
  static PineconeFieldMapping = PineconeFieldMapping;
  static QueryGenerationColumn = QueryGenerationColumn;
  static QueryGenerationConfiguration = QueryGenerationConfiguration;
  static QueryGenerationContext = QueryGenerationContext;
  static QueryGenerationTable = QueryGenerationTable;
  static RdsConfiguration = RdsConfiguration;
  static RdsFieldMapping = RdsFieldMapping;
  static RedshiftConfiguration = RedshiftConfiguration;
  static RedshiftProvisionedAuthConfiguration = RedshiftProvisionedAuthConfiguration;
  static RedshiftProvisionedConfiguration = RedshiftProvisionedConfiguration;
  static RedshiftQueryEngineAwsDataCatalogStorageConfiguration = RedshiftQueryEngineAwsDataCatalogStorageConfiguration;
  static RedshiftQueryEngineConfiguration = RedshiftQueryEngineConfiguration;
  static RedshiftQueryEngineRedshiftStorageConfiguration = RedshiftQueryEngineRedshiftStorageConfiguration;
  static RedshiftQueryEngineStorageConfiguration = RedshiftQueryEngineStorageConfiguration;
  static RedshiftServerlessAuthConfiguration = RedshiftServerlessAuthConfiguration;
  static RedshiftServerlessConfiguration = RedshiftServerlessConfiguration;
  static S3Location = S3Location;
  static SqlKnowledgeBaseConfiguration = SqlKnowledgeBaseConfiguration;
  static StorageConfiguration = StorageConfiguration;
  static SupplementalDataStorageConfiguration = SupplementalDataStorageConfiguration;
  static SupplementalDataStorageLocation = SupplementalDataStorageLocation;
  static VectorKnowledgeBaseConfiguration = VectorKnowledgeBaseConfiguration;
  constructor(properties: KnowledgeBaseProperties) {
    super('AWS::Bedrock::KnowledgeBase', properties);
  }
}
