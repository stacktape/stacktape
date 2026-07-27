import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class ApplicationCodeConfiguration {
  CodeContentType!: Value<string>;
  CodeContent!: CodeContent;
  constructor(properties: ApplicationCodeConfiguration) {
    Object.assign(this, properties);
  }
}

export class ApplicationConfiguration {
  ApplicationCodeConfiguration?: ApplicationCodeConfiguration;
  ApplicationEncryptionConfiguration?: ApplicationEncryptionConfiguration;
  EnvironmentProperties?: EnvironmentProperties;
  FlinkApplicationConfiguration?: FlinkApplicationConfiguration;
  SqlApplicationConfiguration?: SqlApplicationConfiguration;
  ZeppelinApplicationConfiguration?: ZeppelinApplicationConfiguration;
  VpcConfigurations?: List<VpcConfiguration>;
  ApplicationSnapshotConfiguration?: ApplicationSnapshotConfiguration;
  ApplicationSystemRollbackConfiguration?: ApplicationSystemRollbackConfiguration;
  constructor(properties: ApplicationConfiguration) {
    Object.assign(this, properties);
  }
}

export class ApplicationEncryptionConfiguration {
  KeyType!: Value<string>;
  KeyId?: Value<string>;
  constructor(properties: ApplicationEncryptionConfiguration) {
    Object.assign(this, properties);
  }
}

export class ApplicationMaintenanceConfiguration {
  ApplicationMaintenanceWindowStartTime!: Value<string>;
  constructor(properties: ApplicationMaintenanceConfiguration) {
    Object.assign(this, properties);
  }
}

export class ApplicationRestoreConfiguration {
  SnapshotName?: Value<string>;
  ApplicationRestoreType!: Value<string>;
  constructor(properties: ApplicationRestoreConfiguration) {
    Object.assign(this, properties);
  }
}

export class ApplicationSnapshotConfiguration {
  SnapshotsEnabled!: Value<boolean>;
  constructor(properties: ApplicationSnapshotConfiguration) {
    Object.assign(this, properties);
  }
}

export class ApplicationSystemRollbackConfiguration {
  RollbackEnabled!: Value<boolean>;
  constructor(properties: ApplicationSystemRollbackConfiguration) {
    Object.assign(this, properties);
  }
}

export class CSVMappingParameters {
  RecordRowDelimiter!: Value<string>;
  RecordColumnDelimiter!: Value<string>;
  constructor(properties: CSVMappingParameters) {
    Object.assign(this, properties);
  }
}

export class CatalogConfiguration {
  GlueDataCatalogConfiguration?: GlueDataCatalogConfiguration;
  constructor(properties: CatalogConfiguration) {
    Object.assign(this, properties);
  }
}

export class CheckpointConfiguration {
  ConfigurationType!: Value<string>;
  CheckpointInterval?: Value<number>;
  MinPauseBetweenCheckpoints?: Value<number>;
  CheckpointingEnabled?: Value<boolean>;
  constructor(properties: CheckpointConfiguration) {
    Object.assign(this, properties);
  }
}

export class CodeContent {
  ZipFileContent?: Value<string>;
  S3ContentLocation?: S3ContentLocation;
  TextContent?: Value<string>;
  constructor(properties: CodeContent) {
    Object.assign(this, properties);
  }
}

export class CustomArtifactConfiguration {
  MavenReference?: MavenReference;
  S3ContentLocation?: S3ContentLocation;
  ArtifactType!: Value<string>;
  constructor(properties: CustomArtifactConfiguration) {
    Object.assign(this, properties);
  }
}

export class DeployAsApplicationConfiguration {
  S3ContentLocation!: S3ContentBaseLocation;
  constructor(properties: DeployAsApplicationConfiguration) {
    Object.assign(this, properties);
  }
}

export class EnvironmentProperties {
  PropertyGroups?: List<PropertyGroup>;
  constructor(properties: EnvironmentProperties) {
    Object.assign(this, properties);
  }
}

export class FlinkApplicationConfiguration {
  CheckpointConfiguration?: CheckpointConfiguration;
  ParallelismConfiguration?: ParallelismConfiguration;
  MonitoringConfiguration?: MonitoringConfiguration;
  constructor(properties: FlinkApplicationConfiguration) {
    Object.assign(this, properties);
  }
}

export class FlinkRunConfiguration {
  AllowNonRestoredState?: Value<boolean>;
  constructor(properties: FlinkRunConfiguration) {
    Object.assign(this, properties);
  }
}

export class GlueDataCatalogConfiguration {
  DatabaseARN?: Value<string>;
  constructor(properties: GlueDataCatalogConfiguration) {
    Object.assign(this, properties);
  }
}

export class Input {
  NamePrefix!: Value<string>;
  InputSchema!: InputSchema;
  KinesisStreamsInput?: KinesisStreamsInput;
  KinesisFirehoseInput?: KinesisFirehoseInput;
  InputProcessingConfiguration?: InputProcessingConfiguration;
  InputParallelism?: InputParallelism;
  constructor(properties: Input) {
    Object.assign(this, properties);
  }
}

export class InputLambdaProcessor {
  ResourceARN!: Value<string>;
  constructor(properties: InputLambdaProcessor) {
    Object.assign(this, properties);
  }
}

export class InputParallelism {
  Count?: Value<number>;
  constructor(properties: InputParallelism) {
    Object.assign(this, properties);
  }
}

export class InputProcessingConfiguration {
  InputLambdaProcessor?: InputLambdaProcessor;
  constructor(properties: InputProcessingConfiguration) {
    Object.assign(this, properties);
  }
}

export class InputSchema {
  RecordEncoding?: Value<string>;
  RecordColumns!: List<RecordColumn>;
  RecordFormat!: RecordFormat;
  constructor(properties: InputSchema) {
    Object.assign(this, properties);
  }
}

export class JSONMappingParameters {
  RecordRowPath!: Value<string>;
  constructor(properties: JSONMappingParameters) {
    Object.assign(this, properties);
  }
}

export class KinesisFirehoseInput {
  ResourceARN!: Value<string>;
  constructor(properties: KinesisFirehoseInput) {
    Object.assign(this, properties);
  }
}

export class KinesisStreamsInput {
  ResourceARN!: Value<string>;
  constructor(properties: KinesisStreamsInput) {
    Object.assign(this, properties);
  }
}

export class MappingParameters {
  JSONMappingParameters?: JSONMappingParameters;
  CSVMappingParameters?: CSVMappingParameters;
  constructor(properties: MappingParameters) {
    Object.assign(this, properties);
  }
}

export class MavenReference {
  ArtifactId!: Value<string>;
  Version!: Value<string>;
  GroupId!: Value<string>;
  constructor(properties: MavenReference) {
    Object.assign(this, properties);
  }
}

export class MonitoringConfiguration {
  ConfigurationType!: Value<string>;
  MetricsLevel?: Value<string>;
  LogLevel?: Value<string>;
  constructor(properties: MonitoringConfiguration) {
    Object.assign(this, properties);
  }
}

export class ParallelismConfiguration {
  ConfigurationType!: Value<string>;
  ParallelismPerKPU?: Value<number>;
  AutoScalingEnabled?: Value<boolean>;
  Parallelism?: Value<number>;
  constructor(properties: ParallelismConfiguration) {
    Object.assign(this, properties);
  }
}

export class PropertyGroup {
  PropertyMap?: { [key: string]: Value<string> };
  PropertyGroupId?: Value<string>;
  constructor(properties: PropertyGroup) {
    Object.assign(this, properties);
  }
}

export class RecordColumn {
  Mapping?: Value<string>;
  SqlType!: Value<string>;
  Name!: Value<string>;
  constructor(properties: RecordColumn) {
    Object.assign(this, properties);
  }
}

export class RecordFormat {
  MappingParameters?: MappingParameters;
  RecordFormatType!: Value<string>;
  constructor(properties: RecordFormat) {
    Object.assign(this, properties);
  }
}

export class RunConfiguration {
  FlinkRunConfiguration?: FlinkRunConfiguration;
  ApplicationRestoreConfiguration?: ApplicationRestoreConfiguration;
  constructor(properties: RunConfiguration) {
    Object.assign(this, properties);
  }
}

export class S3ContentBaseLocation {
  BucketARN!: Value<string>;
  BasePath?: Value<string>;
  constructor(properties: S3ContentBaseLocation) {
    Object.assign(this, properties);
  }
}

export class S3ContentLocation {
  BucketARN!: Value<string>;
  FileKey!: Value<string>;
  ObjectVersion?: Value<string>;
  constructor(properties: S3ContentLocation) {
    Object.assign(this, properties);
  }
}

export class SqlApplicationConfiguration {
  Inputs?: List<Input>;
  constructor(properties: SqlApplicationConfiguration) {
    Object.assign(this, properties);
  }
}

export class VpcConfiguration {
  SecurityGroupIds!: List<Value<string>>;
  SubnetIds!: List<Value<string>>;
  constructor(properties: VpcConfiguration) {
    Object.assign(this, properties);
  }
}

export class ZeppelinApplicationConfiguration {
  CatalogConfiguration?: CatalogConfiguration;
  MonitoringConfiguration?: ZeppelinMonitoringConfiguration;
  DeployAsApplicationConfiguration?: DeployAsApplicationConfiguration;
  CustomArtifactsConfiguration?: List<CustomArtifactConfiguration>;
  constructor(properties: ZeppelinApplicationConfiguration) {
    Object.assign(this, properties);
  }
}

export class ZeppelinMonitoringConfiguration {
  LogLevel?: Value<string>;
  constructor(properties: ZeppelinMonitoringConfiguration) {
    Object.assign(this, properties);
  }
}
export interface ApplicationProperties {
  ApplicationName?: Value<string>;
  RuntimeEnvironment: Value<string>;
  RunConfiguration?: RunConfiguration;
  ApplicationMode?: Value<string>;
  ApplicationMaintenanceConfiguration?: ApplicationMaintenanceConfiguration;
  ApplicationConfiguration?: ApplicationConfiguration;
  ApplicationDescription?: Value<string>;
  Tags?: List<ResourceTag>;
  ServiceExecutionRole: Value<string>;
}
export default class Application extends ResourceBase<ApplicationProperties> {
  static ApplicationCodeConfiguration = ApplicationCodeConfiguration;
  static ApplicationConfiguration = ApplicationConfiguration;
  static ApplicationEncryptionConfiguration = ApplicationEncryptionConfiguration;
  static ApplicationMaintenanceConfiguration = ApplicationMaintenanceConfiguration;
  static ApplicationRestoreConfiguration = ApplicationRestoreConfiguration;
  static ApplicationSnapshotConfiguration = ApplicationSnapshotConfiguration;
  static ApplicationSystemRollbackConfiguration = ApplicationSystemRollbackConfiguration;
  static CSVMappingParameters = CSVMappingParameters;
  static CatalogConfiguration = CatalogConfiguration;
  static CheckpointConfiguration = CheckpointConfiguration;
  static CodeContent = CodeContent;
  static CustomArtifactConfiguration = CustomArtifactConfiguration;
  static DeployAsApplicationConfiguration = DeployAsApplicationConfiguration;
  static EnvironmentProperties = EnvironmentProperties;
  static FlinkApplicationConfiguration = FlinkApplicationConfiguration;
  static FlinkRunConfiguration = FlinkRunConfiguration;
  static GlueDataCatalogConfiguration = GlueDataCatalogConfiguration;
  static Input = Input;
  static InputLambdaProcessor = InputLambdaProcessor;
  static InputParallelism = InputParallelism;
  static InputProcessingConfiguration = InputProcessingConfiguration;
  static InputSchema = InputSchema;
  static JSONMappingParameters = JSONMappingParameters;
  static KinesisFirehoseInput = KinesisFirehoseInput;
  static KinesisStreamsInput = KinesisStreamsInput;
  static MappingParameters = MappingParameters;
  static MavenReference = MavenReference;
  static MonitoringConfiguration = MonitoringConfiguration;
  static ParallelismConfiguration = ParallelismConfiguration;
  static PropertyGroup = PropertyGroup;
  static RecordColumn = RecordColumn;
  static RecordFormat = RecordFormat;
  static RunConfiguration = RunConfiguration;
  static S3ContentBaseLocation = S3ContentBaseLocation;
  static S3ContentLocation = S3ContentLocation;
  static SqlApplicationConfiguration = SqlApplicationConfiguration;
  static VpcConfiguration = VpcConfiguration;
  static ZeppelinApplicationConfiguration = ZeppelinApplicationConfiguration;
  static ZeppelinMonitoringConfiguration = ZeppelinMonitoringConfiguration;
  constructor(properties: ApplicationProperties) {
    super('AWS::KinesisAnalyticsV2::Application', properties);
  }
}
