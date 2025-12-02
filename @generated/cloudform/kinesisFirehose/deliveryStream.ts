import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AmazonOpenSearchServerlessBufferingHints {
  IntervalInSeconds?: Value<number>;
  SizeInMBs?: Value<number>;
  constructor(properties: AmazonOpenSearchServerlessBufferingHints) {
    Object.assign(this, properties);
  }
}

export class AmazonOpenSearchServerlessDestinationConfiguration {
  IndexName!: Value<string>;
  S3Configuration!: S3DestinationConfiguration;
  BufferingHints?: AmazonOpenSearchServerlessBufferingHints;
  RetryOptions?: AmazonOpenSearchServerlessRetryOptions;
  CollectionEndpoint?: Value<string>;
  VpcConfiguration?: VpcConfiguration;
  ProcessingConfiguration?: ProcessingConfiguration;
  CloudWatchLoggingOptions?: CloudWatchLoggingOptions;
  RoleARN!: Value<string>;
  S3BackupMode?: Value<string>;
  constructor(properties: AmazonOpenSearchServerlessDestinationConfiguration) {
    Object.assign(this, properties);
  }
}

export class AmazonOpenSearchServerlessRetryOptions {
  DurationInSeconds?: Value<number>;
  constructor(properties: AmazonOpenSearchServerlessRetryOptions) {
    Object.assign(this, properties);
  }
}

export class AmazonopensearchserviceBufferingHints {
  IntervalInSeconds?: Value<number>;
  SizeInMBs?: Value<number>;
  constructor(properties: AmazonopensearchserviceBufferingHints) {
    Object.assign(this, properties);
  }
}

export class AmazonopensearchserviceDestinationConfiguration {
  TypeName?: Value<string>;
  IndexRotationPeriod?: Value<string>;
  ProcessingConfiguration?: ProcessingConfiguration;
  ClusterEndpoint?: Value<string>;
  DomainARN?: Value<string>;
  RoleARN!: Value<string>;
  S3BackupMode?: Value<string>;
  IndexName!: Value<string>;
  DocumentIdOptions?: DocumentIdOptions;
  S3Configuration!: S3DestinationConfiguration;
  BufferingHints?: AmazonopensearchserviceBufferingHints;
  RetryOptions?: AmazonopensearchserviceRetryOptions;
  VpcConfiguration?: VpcConfiguration;
  CloudWatchLoggingOptions?: CloudWatchLoggingOptions;
  constructor(properties: AmazonopensearchserviceDestinationConfiguration) {
    Object.assign(this, properties);
  }
}

export class AmazonopensearchserviceRetryOptions {
  DurationInSeconds?: Value<number>;
  constructor(properties: AmazonopensearchserviceRetryOptions) {
    Object.assign(this, properties);
  }
}

export class AuthenticationConfiguration {
  Connectivity!: Value<string>;
  RoleARN!: Value<string>;
  constructor(properties: AuthenticationConfiguration) {
    Object.assign(this, properties);
  }
}

export class BufferingHints {
  IntervalInSeconds?: Value<number>;
  SizeInMBs?: Value<number>;
  constructor(properties: BufferingHints) {
    Object.assign(this, properties);
  }
}

export class CatalogConfiguration {
  CatalogArn?: Value<string>;
  WarehouseLocation?: Value<string>;
  constructor(properties: CatalogConfiguration) {
    Object.assign(this, properties);
  }
}

export class CloudWatchLoggingOptions {
  LogStreamName?: Value<string>;
  Enabled?: Value<boolean>;
  LogGroupName?: Value<string>;
  constructor(properties: CloudWatchLoggingOptions) {
    Object.assign(this, properties);
  }
}

export class CopyCommand {
  DataTableName!: Value<string>;
  CopyOptions?: Value<string>;
  DataTableColumns?: Value<string>;
  constructor(properties: CopyCommand) {
    Object.assign(this, properties);
  }
}

export class DataFormatConversionConfiguration {
  InputFormatConfiguration?: InputFormatConfiguration;
  Enabled?: Value<boolean>;
  SchemaConfiguration?: SchemaConfiguration;
  OutputFormatConfiguration?: OutputFormatConfiguration;
  constructor(properties: DataFormatConversionConfiguration) {
    Object.assign(this, properties);
  }
}

export class DatabaseColumns {
  Exclude?: List<Value<string>>;
  Include?: List<Value<string>>;
  constructor(properties: DatabaseColumns) {
    Object.assign(this, properties);
  }
}

export class DatabaseSourceAuthenticationConfiguration {
  SecretsManagerConfiguration!: SecretsManagerConfiguration;
  constructor(properties: DatabaseSourceAuthenticationConfiguration) {
    Object.assign(this, properties);
  }
}

export class DatabaseSourceConfiguration {
  Digest?: Value<string>;
  Port!: Value<number>;
  PublicCertificate?: Value<string>;
  Columns?: DatabaseColumns;
  Type!: Value<string>;
  SurrogateKeys?: List<Value<string>>;
  Databases!: Databases;
  Endpoint!: Value<string>;
  SSLMode?: Value<string>;
  SnapshotWatermarkTable!: Value<string>;
  DatabaseSourceAuthenticationConfiguration!: DatabaseSourceAuthenticationConfiguration;
  Tables!: DatabaseTables;
  DatabaseSourceVPCConfiguration!: DatabaseSourceVPCConfiguration;
  constructor(properties: DatabaseSourceConfiguration) {
    Object.assign(this, properties);
  }
}

export class DatabaseSourceVPCConfiguration {
  VpcEndpointServiceName!: Value<string>;
  constructor(properties: DatabaseSourceVPCConfiguration) {
    Object.assign(this, properties);
  }
}

export class DatabaseTables {
  Exclude?: List<Value<string>>;
  Include?: List<Value<string>>;
  constructor(properties: DatabaseTables) {
    Object.assign(this, properties);
  }
}

export class Databases {
  Exclude?: List<Value<string>>;
  Include?: List<Value<string>>;
  constructor(properties: Databases) {
    Object.assign(this, properties);
  }
}

export class DeliveryStreamEncryptionConfigurationInput {
  KeyType!: Value<string>;
  KeyARN?: Value<string>;
  constructor(properties: DeliveryStreamEncryptionConfigurationInput) {
    Object.assign(this, properties);
  }
}

export class Deserializer {
  HiveJsonSerDe?: HiveJsonSerDe;
  OpenXJsonSerDe?: OpenXJsonSerDe;
  constructor(properties: Deserializer) {
    Object.assign(this, properties);
  }
}

export class DestinationTableConfiguration {
  DestinationDatabaseName!: Value<string>;
  S3ErrorOutputPrefix?: Value<string>;
  DestinationTableName!: Value<string>;
  UniqueKeys?: List<Value<string>>;
  PartitionSpec?: PartitionSpec;
  constructor(properties: DestinationTableConfiguration) {
    Object.assign(this, properties);
  }
}

export class DirectPutSourceConfiguration {
  ThroughputHintInMBs?: Value<number>;
  constructor(properties: DirectPutSourceConfiguration) {
    Object.assign(this, properties);
  }
}

export class DocumentIdOptions {
  DefaultDocumentIdFormat!: Value<string>;
  constructor(properties: DocumentIdOptions) {
    Object.assign(this, properties);
  }
}

export class DynamicPartitioningConfiguration {
  Enabled?: Value<boolean>;
  RetryOptions?: RetryOptions;
  constructor(properties: DynamicPartitioningConfiguration) {
    Object.assign(this, properties);
  }
}

export class ElasticsearchBufferingHints {
  IntervalInSeconds?: Value<number>;
  SizeInMBs?: Value<number>;
  constructor(properties: ElasticsearchBufferingHints) {
    Object.assign(this, properties);
  }
}

export class ElasticsearchDestinationConfiguration {
  TypeName?: Value<string>;
  IndexRotationPeriod?: Value<string>;
  ProcessingConfiguration?: ProcessingConfiguration;
  ClusterEndpoint?: Value<string>;
  DomainARN?: Value<string>;
  RoleARN!: Value<string>;
  S3BackupMode?: Value<string>;
  IndexName!: Value<string>;
  DocumentIdOptions?: DocumentIdOptions;
  S3Configuration!: S3DestinationConfiguration;
  BufferingHints?: ElasticsearchBufferingHints;
  RetryOptions?: ElasticsearchRetryOptions;
  VpcConfiguration?: VpcConfiguration;
  CloudWatchLoggingOptions?: CloudWatchLoggingOptions;
  constructor(properties: ElasticsearchDestinationConfiguration) {
    Object.assign(this, properties);
  }
}

export class ElasticsearchRetryOptions {
  DurationInSeconds?: Value<number>;
  constructor(properties: ElasticsearchRetryOptions) {
    Object.assign(this, properties);
  }
}

export class EncryptionConfiguration {
  KMSEncryptionConfig?: KMSEncryptionConfig;
  NoEncryptionConfig?: Value<string>;
  constructor(properties: EncryptionConfiguration) {
    Object.assign(this, properties);
  }
}

export class ExtendedS3DestinationConfiguration {
  ErrorOutputPrefix?: Value<string>;
  S3BackupConfiguration?: S3DestinationConfiguration;
  BucketARN!: Value<string>;
  CompressionFormat?: Value<string>;
  DataFormatConversionConfiguration?: DataFormatConversionConfiguration;
  EncryptionConfiguration?: EncryptionConfiguration;
  CustomTimeZone?: Value<string>;
  DynamicPartitioningConfiguration?: DynamicPartitioningConfiguration;
  Prefix?: Value<string>;
  ProcessingConfiguration?: ProcessingConfiguration;
  RoleARN!: Value<string>;
  S3BackupMode?: Value<string>;
  BufferingHints?: BufferingHints;
  FileExtension?: Value<string>;
  CloudWatchLoggingOptions?: CloudWatchLoggingOptions;
  constructor(properties: ExtendedS3DestinationConfiguration) {
    Object.assign(this, properties);
  }
}

export class HiveJsonSerDe {
  TimestampFormats?: List<Value<string>>;
  constructor(properties: HiveJsonSerDe) {
    Object.assign(this, properties);
  }
}

export class HttpEndpointCommonAttribute {
  AttributeValue!: Value<string>;
  AttributeName!: Value<string>;
  constructor(properties: HttpEndpointCommonAttribute) {
    Object.assign(this, properties);
  }
}

export class HttpEndpointConfiguration {
  AccessKey?: Value<string>;
  Url!: Value<string>;
  Name?: Value<string>;
  constructor(properties: HttpEndpointConfiguration) {
    Object.assign(this, properties);
  }
}

export class HttpEndpointDestinationConfiguration {
  RequestConfiguration?: HttpEndpointRequestConfiguration;
  S3Configuration!: S3DestinationConfiguration;
  BufferingHints?: BufferingHints;
  RetryOptions?: RetryOptions;
  SecretsManagerConfiguration?: SecretsManagerConfiguration;
  EndpointConfiguration!: HttpEndpointConfiguration;
  ProcessingConfiguration?: ProcessingConfiguration;
  RoleARN?: Value<string>;
  CloudWatchLoggingOptions?: CloudWatchLoggingOptions;
  S3BackupMode?: Value<string>;
  constructor(properties: HttpEndpointDestinationConfiguration) {
    Object.assign(this, properties);
  }
}

export class HttpEndpointRequestConfiguration {
  CommonAttributes?: List<HttpEndpointCommonAttribute>;
  ContentEncoding?: Value<string>;
  constructor(properties: HttpEndpointRequestConfiguration) {
    Object.assign(this, properties);
  }
}

export class IcebergDestinationConfiguration {
  CatalogConfiguration!: CatalogConfiguration;
  S3Configuration!: S3DestinationConfiguration;
  DestinationTableConfigurationList?: List<DestinationTableConfiguration>;
  BufferingHints?: BufferingHints;
  TableCreationConfiguration?: TableCreationConfiguration;
  RetryOptions?: RetryOptions;
  s3BackupMode?: Value<string>;
  ProcessingConfiguration?: ProcessingConfiguration;
  SchemaEvolutionConfiguration?: SchemaEvolutionConfiguration;
  AppendOnly?: Value<boolean>;
  CloudWatchLoggingOptions?: CloudWatchLoggingOptions;
  RoleARN!: Value<string>;
  constructor(properties: IcebergDestinationConfiguration) {
    Object.assign(this, properties);
  }
}

export class InputFormatConfiguration {
  Deserializer?: Deserializer;
  constructor(properties: InputFormatConfiguration) {
    Object.assign(this, properties);
  }
}

export class KMSEncryptionConfig {
  AWSKMSKeyARN!: Value<string>;
  constructor(properties: KMSEncryptionConfig) {
    Object.assign(this, properties);
  }
}

export class KinesisStreamSourceConfiguration {
  KinesisStreamARN!: Value<string>;
  RoleARN!: Value<string>;
  constructor(properties: KinesisStreamSourceConfiguration) {
    Object.assign(this, properties);
  }
}

export class MSKSourceConfiguration {
  AuthenticationConfiguration!: AuthenticationConfiguration;
  ReadFromTimestamp?: Value<string>;
  MSKClusterARN!: Value<string>;
  TopicName!: Value<string>;
  constructor(properties: MSKSourceConfiguration) {
    Object.assign(this, properties);
  }
}

export class OpenXJsonSerDe {
  ConvertDotsInJsonKeysToUnderscores?: Value<boolean>;
  ColumnToJsonKeyMappings?: { [key: string]: Value<string> };
  CaseInsensitive?: Value<boolean>;
  constructor(properties: OpenXJsonSerDe) {
    Object.assign(this, properties);
  }
}

export class OrcSerDe {
  PaddingTolerance?: Value<number>;
  Compression?: Value<string>;
  StripeSizeBytes?: Value<number>;
  BloomFilterColumns?: List<Value<string>>;
  BloomFilterFalsePositiveProbability?: Value<number>;
  EnablePadding?: Value<boolean>;
  FormatVersion?: Value<string>;
  RowIndexStride?: Value<number>;
  BlockSizeBytes?: Value<number>;
  DictionaryKeyThreshold?: Value<number>;
  constructor(properties: OrcSerDe) {
    Object.assign(this, properties);
  }
}

export class OutputFormatConfiguration {
  Serializer?: Serializer;
  constructor(properties: OutputFormatConfiguration) {
    Object.assign(this, properties);
  }
}

export class ParquetSerDe {
  Compression?: Value<string>;
  BlockSizeBytes?: Value<number>;
  EnableDictionaryCompression?: Value<boolean>;
  PageSizeBytes?: Value<number>;
  MaxPaddingBytes?: Value<number>;
  WriterVersion?: Value<string>;
  constructor(properties: ParquetSerDe) {
    Object.assign(this, properties);
  }
}

export class PartitionField {
  SourceName!: Value<string>;
  constructor(properties: PartitionField) {
    Object.assign(this, properties);
  }
}

export class PartitionSpec {
  Identity?: List<PartitionField>;
  constructor(properties: PartitionSpec) {
    Object.assign(this, properties);
  }
}

export class ProcessingConfiguration {
  Enabled?: Value<boolean>;
  Processors?: List<Processor>;
  constructor(properties: ProcessingConfiguration) {
    Object.assign(this, properties);
  }
}

export class Processor {
  Type!: Value<string>;
  Parameters?: List<ProcessorParameter>;
  constructor(properties: Processor) {
    Object.assign(this, properties);
  }
}

export class ProcessorParameter {
  ParameterValue!: Value<string>;
  ParameterName!: Value<string>;
  constructor(properties: ProcessorParameter) {
    Object.assign(this, properties);
  }
}

export class RedshiftDestinationConfiguration {
  S3BackupConfiguration?: S3DestinationConfiguration;
  S3Configuration!: S3DestinationConfiguration;
  Username?: Value<string>;
  CopyCommand!: CopyCommand;
  RetryOptions?: RedshiftRetryOptions;
  SecretsManagerConfiguration?: SecretsManagerConfiguration;
  ProcessingConfiguration?: ProcessingConfiguration;
  CloudWatchLoggingOptions?: CloudWatchLoggingOptions;
  ClusterJDBCURL!: Value<string>;
  RoleARN!: Value<string>;
  Password?: Value<string>;
  S3BackupMode?: Value<string>;
  constructor(properties: RedshiftDestinationConfiguration) {
    Object.assign(this, properties);
  }
}

export class RedshiftRetryOptions {
  DurationInSeconds?: Value<number>;
  constructor(properties: RedshiftRetryOptions) {
    Object.assign(this, properties);
  }
}

export class RetryOptions {
  DurationInSeconds?: Value<number>;
  constructor(properties: RetryOptions) {
    Object.assign(this, properties);
  }
}

export class S3DestinationConfiguration {
  ErrorOutputPrefix?: Value<string>;
  BucketARN!: Value<string>;
  BufferingHints?: BufferingHints;
  CompressionFormat?: Value<string>;
  EncryptionConfiguration?: EncryptionConfiguration;
  Prefix?: Value<string>;
  CloudWatchLoggingOptions?: CloudWatchLoggingOptions;
  RoleARN!: Value<string>;
  constructor(properties: S3DestinationConfiguration) {
    Object.assign(this, properties);
  }
}

export class SchemaConfiguration {
  VersionId?: Value<string>;
  TableName?: Value<string>;
  DatabaseName?: Value<string>;
  Region?: Value<string>;
  CatalogId?: Value<string>;
  RoleARN?: Value<string>;
  constructor(properties: SchemaConfiguration) {
    Object.assign(this, properties);
  }
}

export class SchemaEvolutionConfiguration {
  Enabled?: Value<boolean>;
  constructor(properties: SchemaEvolutionConfiguration) {
    Object.assign(this, properties);
  }
}

export class SecretsManagerConfiguration {
  SecretARN?: Value<string>;
  Enabled!: Value<boolean>;
  RoleARN?: Value<string>;
  constructor(properties: SecretsManagerConfiguration) {
    Object.assign(this, properties);
  }
}

export class Serializer {
  OrcSerDe?: OrcSerDe;
  ParquetSerDe?: ParquetSerDe;
  constructor(properties: Serializer) {
    Object.assign(this, properties);
  }
}

export class SnowflakeBufferingHints {
  IntervalInSeconds?: Value<number>;
  SizeInMBs?: Value<number>;
  constructor(properties: SnowflakeBufferingHints) {
    Object.assign(this, properties);
  }
}

export class SnowflakeDestinationConfiguration {
  PrivateKey?: Value<string>;
  User?: Value<string>;
  Table!: Value<string>;
  SnowflakeVpcConfiguration?: SnowflakeVpcConfiguration;
  DataLoadingOption?: Value<string>;
  Schema!: Value<string>;
  ContentColumnName?: Value<string>;
  SecretsManagerConfiguration?: SecretsManagerConfiguration;
  SnowflakeRoleConfiguration?: SnowflakeRoleConfiguration;
  ProcessingConfiguration?: ProcessingConfiguration;
  AccountUrl!: Value<string>;
  RoleARN!: Value<string>;
  S3BackupMode?: Value<string>;
  S3Configuration!: S3DestinationConfiguration;
  BufferingHints?: SnowflakeBufferingHints;
  MetaDataColumnName?: Value<string>;
  Database!: Value<string>;
  RetryOptions?: SnowflakeRetryOptions;
  KeyPassphrase?: Value<string>;
  CloudWatchLoggingOptions?: CloudWatchLoggingOptions;
  constructor(properties: SnowflakeDestinationConfiguration) {
    Object.assign(this, properties);
  }
}

export class SnowflakeRetryOptions {
  DurationInSeconds?: Value<number>;
  constructor(properties: SnowflakeRetryOptions) {
    Object.assign(this, properties);
  }
}

export class SnowflakeRoleConfiguration {
  SnowflakeRole?: Value<string>;
  Enabled?: Value<boolean>;
  constructor(properties: SnowflakeRoleConfiguration) {
    Object.assign(this, properties);
  }
}

export class SnowflakeVpcConfiguration {
  PrivateLinkVpceId!: Value<string>;
  constructor(properties: SnowflakeVpcConfiguration) {
    Object.assign(this, properties);
  }
}

export class SplunkBufferingHints {
  IntervalInSeconds?: Value<number>;
  SizeInMBs?: Value<number>;
  constructor(properties: SplunkBufferingHints) {
    Object.assign(this, properties);
  }
}

export class SplunkDestinationConfiguration {
  HECEndpoint!: Value<string>;
  S3Configuration!: S3DestinationConfiguration;
  BufferingHints?: SplunkBufferingHints;
  HECToken?: Value<string>;
  RetryOptions?: SplunkRetryOptions;
  HECEndpointType!: Value<string>;
  SecretsManagerConfiguration?: SecretsManagerConfiguration;
  HECAcknowledgmentTimeoutInSeconds?: Value<number>;
  ProcessingConfiguration?: ProcessingConfiguration;
  CloudWatchLoggingOptions?: CloudWatchLoggingOptions;
  S3BackupMode?: Value<string>;
  constructor(properties: SplunkDestinationConfiguration) {
    Object.assign(this, properties);
  }
}

export class SplunkRetryOptions {
  DurationInSeconds?: Value<number>;
  constructor(properties: SplunkRetryOptions) {
    Object.assign(this, properties);
  }
}

export class TableCreationConfiguration {
  Enabled?: Value<boolean>;
  constructor(properties: TableCreationConfiguration) {
    Object.assign(this, properties);
  }
}

export class VpcConfiguration {
  SubnetIds!: List<Value<string>>;
  SecurityGroupIds!: List<Value<string>>;
  RoleARN!: Value<string>;
  constructor(properties: VpcConfiguration) {
    Object.assign(this, properties);
  }
}
export interface DeliveryStreamProperties {
  DeliveryStreamEncryptionConfigurationInput?: DeliveryStreamEncryptionConfigurationInput;
  HttpEndpointDestinationConfiguration?: HttpEndpointDestinationConfiguration;
  KinesisStreamSourceConfiguration?: KinesisStreamSourceConfiguration;
  DeliveryStreamType?: Value<string>;
  IcebergDestinationConfiguration?: IcebergDestinationConfiguration;
  RedshiftDestinationConfiguration?: RedshiftDestinationConfiguration;
  AmazonopensearchserviceDestinationConfiguration?: AmazonopensearchserviceDestinationConfiguration;
  MSKSourceConfiguration?: MSKSourceConfiguration;
  DirectPutSourceConfiguration?: DirectPutSourceConfiguration;
  SplunkDestinationConfiguration?: SplunkDestinationConfiguration;
  ExtendedS3DestinationConfiguration?: ExtendedS3DestinationConfiguration;
  AmazonOpenSearchServerlessDestinationConfiguration?: AmazonOpenSearchServerlessDestinationConfiguration;
  ElasticsearchDestinationConfiguration?: ElasticsearchDestinationConfiguration;
  SnowflakeDestinationConfiguration?: SnowflakeDestinationConfiguration;
  DatabaseSourceConfiguration?: DatabaseSourceConfiguration;
  S3DestinationConfiguration?: S3DestinationConfiguration;
  DeliveryStreamName?: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class DeliveryStream extends ResourceBase<DeliveryStreamProperties> {
  static AmazonOpenSearchServerlessBufferingHints = AmazonOpenSearchServerlessBufferingHints;
  static AmazonOpenSearchServerlessDestinationConfiguration = AmazonOpenSearchServerlessDestinationConfiguration;
  static AmazonOpenSearchServerlessRetryOptions = AmazonOpenSearchServerlessRetryOptions;
  static AmazonopensearchserviceBufferingHints = AmazonopensearchserviceBufferingHints;
  static AmazonopensearchserviceDestinationConfiguration = AmazonopensearchserviceDestinationConfiguration;
  static AmazonopensearchserviceRetryOptions = AmazonopensearchserviceRetryOptions;
  static AuthenticationConfiguration = AuthenticationConfiguration;
  static BufferingHints = BufferingHints;
  static CatalogConfiguration = CatalogConfiguration;
  static CloudWatchLoggingOptions = CloudWatchLoggingOptions;
  static CopyCommand = CopyCommand;
  static DataFormatConversionConfiguration = DataFormatConversionConfiguration;
  static DatabaseColumns = DatabaseColumns;
  static DatabaseSourceAuthenticationConfiguration = DatabaseSourceAuthenticationConfiguration;
  static DatabaseSourceConfiguration = DatabaseSourceConfiguration;
  static DatabaseSourceVPCConfiguration = DatabaseSourceVPCConfiguration;
  static DatabaseTables = DatabaseTables;
  static Databases = Databases;
  static DeliveryStreamEncryptionConfigurationInput = DeliveryStreamEncryptionConfigurationInput;
  static Deserializer = Deserializer;
  static DestinationTableConfiguration = DestinationTableConfiguration;
  static DirectPutSourceConfiguration = DirectPutSourceConfiguration;
  static DocumentIdOptions = DocumentIdOptions;
  static DynamicPartitioningConfiguration = DynamicPartitioningConfiguration;
  static ElasticsearchBufferingHints = ElasticsearchBufferingHints;
  static ElasticsearchDestinationConfiguration = ElasticsearchDestinationConfiguration;
  static ElasticsearchRetryOptions = ElasticsearchRetryOptions;
  static EncryptionConfiguration = EncryptionConfiguration;
  static ExtendedS3DestinationConfiguration = ExtendedS3DestinationConfiguration;
  static HiveJsonSerDe = HiveJsonSerDe;
  static HttpEndpointCommonAttribute = HttpEndpointCommonAttribute;
  static HttpEndpointConfiguration = HttpEndpointConfiguration;
  static HttpEndpointDestinationConfiguration = HttpEndpointDestinationConfiguration;
  static HttpEndpointRequestConfiguration = HttpEndpointRequestConfiguration;
  static IcebergDestinationConfiguration = IcebergDestinationConfiguration;
  static InputFormatConfiguration = InputFormatConfiguration;
  static KMSEncryptionConfig = KMSEncryptionConfig;
  static KinesisStreamSourceConfiguration = KinesisStreamSourceConfiguration;
  static MSKSourceConfiguration = MSKSourceConfiguration;
  static OpenXJsonSerDe = OpenXJsonSerDe;
  static OrcSerDe = OrcSerDe;
  static OutputFormatConfiguration = OutputFormatConfiguration;
  static ParquetSerDe = ParquetSerDe;
  static PartitionField = PartitionField;
  static PartitionSpec = PartitionSpec;
  static ProcessingConfiguration = ProcessingConfiguration;
  static Processor = Processor;
  static ProcessorParameter = ProcessorParameter;
  static RedshiftDestinationConfiguration = RedshiftDestinationConfiguration;
  static RedshiftRetryOptions = RedshiftRetryOptions;
  static RetryOptions = RetryOptions;
  static S3DestinationConfiguration = S3DestinationConfiguration;
  static SchemaConfiguration = SchemaConfiguration;
  static SchemaEvolutionConfiguration = SchemaEvolutionConfiguration;
  static SecretsManagerConfiguration = SecretsManagerConfiguration;
  static Serializer = Serializer;
  static SnowflakeBufferingHints = SnowflakeBufferingHints;
  static SnowflakeDestinationConfiguration = SnowflakeDestinationConfiguration;
  static SnowflakeRetryOptions = SnowflakeRetryOptions;
  static SnowflakeRoleConfiguration = SnowflakeRoleConfiguration;
  static SnowflakeVpcConfiguration = SnowflakeVpcConfiguration;
  static SplunkBufferingHints = SplunkBufferingHints;
  static SplunkDestinationConfiguration = SplunkDestinationConfiguration;
  static SplunkRetryOptions = SplunkRetryOptions;
  static TableCreationConfiguration = TableCreationConfiguration;
  static VpcConfiguration = VpcConfiguration;
  constructor(properties?: DeliveryStreamProperties) {
    super('AWS::KinesisFirehose::DeliveryStream', properties || {});
  }
}
