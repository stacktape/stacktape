import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AdditionalInferenceSpecificationDefinition {
  Description?: Value<string>;
  SupportedContentTypes?: List<Value<string>>;
  SupportedRealtimeInferenceInstanceTypes?: List<Value<string>>;
  Containers!: List<ModelPackageContainerDefinition>;
  SupportedTransformInstanceTypes?: List<Value<string>>;
  Name!: Value<string>;
  SupportedResponseMIMETypes?: List<Value<string>>;
  constructor(properties: AdditionalInferenceSpecificationDefinition) {
    Object.assign(this, properties);
  }
}

export class Bias {
  Report?: MetricsSource;
  PreTrainingReport?: MetricsSource;
  PostTrainingReport?: MetricsSource;
  constructor(properties: Bias) {
    Object.assign(this, properties);
  }
}

export class DataSource {
  S3DataSource!: S3DataSource;
  constructor(properties: DataSource) {
    Object.assign(this, properties);
  }
}

export class DriftCheckBaselines {
  ModelDataQuality?: DriftCheckModelDataQuality;
  Bias?: DriftCheckBias;
  ModelQuality?: DriftCheckModelQuality;
  Explainability?: DriftCheckExplainability;
  constructor(properties: DriftCheckBaselines) {
    Object.assign(this, properties);
  }
}

export class DriftCheckBias {
  PreTrainingConstraints?: MetricsSource;
  ConfigFile?: FileSource;
  PostTrainingConstraints?: MetricsSource;
  constructor(properties: DriftCheckBias) {
    Object.assign(this, properties);
  }
}

export class DriftCheckExplainability {
  Constraints?: MetricsSource;
  ConfigFile?: FileSource;
  constructor(properties: DriftCheckExplainability) {
    Object.assign(this, properties);
  }
}

export class DriftCheckModelDataQuality {
  Constraints?: MetricsSource;
  Statistics?: MetricsSource;
  constructor(properties: DriftCheckModelDataQuality) {
    Object.assign(this, properties);
  }
}

export class DriftCheckModelQuality {
  Constraints?: MetricsSource;
  Statistics?: MetricsSource;
  constructor(properties: DriftCheckModelQuality) {
    Object.assign(this, properties);
  }
}

export class Explainability {
  Report?: MetricsSource;
  constructor(properties: Explainability) {
    Object.assign(this, properties);
  }
}

export class FileSource {
  ContentType?: Value<string>;
  S3Uri!: Value<string>;
  ContentDigest?: Value<string>;
  constructor(properties: FileSource) {
    Object.assign(this, properties);
  }
}

export class InferenceSpecification {
  SupportedContentTypes!: List<Value<string>>;
  SupportedRealtimeInferenceInstanceTypes?: List<Value<string>>;
  Containers!: List<ModelPackageContainerDefinition>;
  SupportedTransformInstanceTypes?: List<Value<string>>;
  SupportedResponseMIMETypes!: List<Value<string>>;
  constructor(properties: InferenceSpecification) {
    Object.assign(this, properties);
  }
}

export class MetadataProperties {
  GeneratedBy?: Value<string>;
  Repository?: Value<string>;
  CommitId?: Value<string>;
  ProjectId?: Value<string>;
  constructor(properties: MetadataProperties) {
    Object.assign(this, properties);
  }
}

export class MetricsSource {
  ContentType!: Value<string>;
  S3Uri!: Value<string>;
  ContentDigest?: Value<string>;
  constructor(properties: MetricsSource) {
    Object.assign(this, properties);
  }
}

export class ModelAccessConfig {
  AcceptEula!: Value<boolean>;
  constructor(properties: ModelAccessConfig) {
    Object.assign(this, properties);
  }
}

export class ModelCard {
  ModelCardStatus!: Value<string>;
  ModelCardContent!: Value<string>;
  constructor(properties: ModelCard) {
    Object.assign(this, properties);
  }
}

export class ModelDataQuality {
  Constraints?: MetricsSource;
  Statistics?: MetricsSource;
  constructor(properties: ModelDataQuality) {
    Object.assign(this, properties);
  }
}

export class ModelDataSource {
  S3DataSource?: S3ModelDataSource;
  constructor(properties: ModelDataSource) {
    Object.assign(this, properties);
  }
}

export class ModelInput {
  DataInputConfig!: Value<string>;
  constructor(properties: ModelInput) {
    Object.assign(this, properties);
  }
}

export class ModelMetrics {
  ModelDataQuality?: ModelDataQuality;
  Bias?: Bias;
  ModelQuality?: ModelQuality;
  Explainability?: Explainability;
  constructor(properties: ModelMetrics) {
    Object.assign(this, properties);
  }
}

export class ModelPackageContainerDefinition {
  ModelInput?: ModelInput;
  NearestModelName?: Value<string>;
  ContainerHostname?: Value<string>;
  ImageDigest?: Value<string>;
  FrameworkVersion?: Value<string>;
  Environment?: { [key: string]: Value<string> };
  ModelDataUrl?: Value<string>;
  Image!: Value<string>;
  ModelDataSource?: ModelDataSource;
  Framework?: Value<string>;
  constructor(properties: ModelPackageContainerDefinition) {
    Object.assign(this, properties);
  }
}

export class ModelPackageStatusDetails {
  ValidationStatuses?: List<ModelPackageStatusItem>;
  constructor(properties: ModelPackageStatusDetails) {
    Object.assign(this, properties);
  }
}

export class ModelPackageStatusItem {
  Status!: Value<string>;
  FailureReason?: Value<string>;
  Name!: Value<string>;
  constructor(properties: ModelPackageStatusItem) {
    Object.assign(this, properties);
  }
}

export class ModelQuality {
  Constraints?: MetricsSource;
  Statistics?: MetricsSource;
  constructor(properties: ModelQuality) {
    Object.assign(this, properties);
  }
}

export class S3DataSource {
  S3Uri!: Value<string>;
  S3DataType!: Value<string>;
  constructor(properties: S3DataSource) {
    Object.assign(this, properties);
  }
}

export class S3ModelDataSource {
  ModelAccessConfig?: ModelAccessConfig;
  S3DataType!: Value<string>;
  CompressionType!: Value<string>;
  S3Uri!: Value<string>;
  constructor(properties: S3ModelDataSource) {
    Object.assign(this, properties);
  }
}

export class SecurityConfig {
  KmsKeyId!: Value<string>;
  constructor(properties: SecurityConfig) {
    Object.assign(this, properties);
  }
}

export class SourceAlgorithm {
  ModelDataUrl?: Value<string>;
  AlgorithmName!: Value<string>;
  constructor(properties: SourceAlgorithm) {
    Object.assign(this, properties);
  }
}

export class SourceAlgorithmSpecification {
  SourceAlgorithms!: List<SourceAlgorithm>;
  constructor(properties: SourceAlgorithmSpecification) {
    Object.assign(this, properties);
  }
}

export class TransformInput {
  ContentType?: Value<string>;
  SplitType?: Value<string>;
  CompressionType?: Value<string>;
  DataSource!: DataSource;
  constructor(properties: TransformInput) {
    Object.assign(this, properties);
  }
}

export class TransformJobDefinition {
  TransformResources!: TransformResources;
  MaxConcurrentTransforms?: Value<number>;
  MaxPayloadInMB?: Value<number>;
  TransformOutput!: TransformOutput;
  Environment?: { [key: string]: Value<string> };
  TransformInput!: TransformInput;
  BatchStrategy?: Value<string>;
  constructor(properties: TransformJobDefinition) {
    Object.assign(this, properties);
  }
}

export class TransformOutput {
  AssembleWith?: Value<string>;
  Accept?: Value<string>;
  KmsKeyId?: Value<string>;
  S3OutputPath!: Value<string>;
  constructor(properties: TransformOutput) {
    Object.assign(this, properties);
  }
}

export class TransformResources {
  InstanceCount!: Value<number>;
  VolumeKmsKeyId?: Value<string>;
  InstanceType!: Value<string>;
  constructor(properties: TransformResources) {
    Object.assign(this, properties);
  }
}

export class ValidationProfile {
  ProfileName!: Value<string>;
  TransformJobDefinition!: TransformJobDefinition;
  constructor(properties: ValidationProfile) {
    Object.assign(this, properties);
  }
}

export class ValidationSpecification {
  ValidationRole!: Value<string>;
  ValidationProfiles!: List<ValidationProfile>;
  constructor(properties: ValidationSpecification) {
    Object.assign(this, properties);
  }
}
export interface ModelPackageProperties {
  DriftCheckBaselines?: DriftCheckBaselines;
  ModelMetrics?: ModelMetrics;
  Task?: Value<string>;
  CustomerMetadataProperties?: { [key: string]: Value<string> };
  SourceUri?: Value<string>;
  ModelApprovalStatus?: Value<string>;
  ModelPackageVersion?: Value<number>;
  MetadataProperties?: MetadataProperties;
  SourceAlgorithmSpecification?: SourceAlgorithmSpecification;
  ModelPackageStatusDetails?: ModelPackageStatusDetails;
  ModelPackageDescription?: Value<string>;
  AdditionalInferenceSpecificationsToAdd?: List<AdditionalInferenceSpecificationDefinition>;
  SecurityConfig?: SecurityConfig;
  InferenceSpecification?: InferenceSpecification;
  SamplePayloadUrl?: Value<string>;
  Tags?: List<ResourceTag>;
  CertifyForMarketplace?: Value<boolean>;
  ModelPackageGroupName?: Value<string>;
  ApprovalDescription?: Value<string>;
  ModelCard?: ModelCard;
  ValidationSpecification?: ValidationSpecification;
  SkipModelValidation?: Value<string>;
  ModelPackageName?: Value<string>;
  LastModifiedTime?: Value<string>;
  ClientToken?: Value<string>;
  Domain?: Value<string>;
  AdditionalInferenceSpecifications?: List<AdditionalInferenceSpecificationDefinition>;
}
export default class ModelPackage extends ResourceBase<ModelPackageProperties> {
  static AdditionalInferenceSpecificationDefinition = AdditionalInferenceSpecificationDefinition;
  static Bias = Bias;
  static DataSource = DataSource;
  static DriftCheckBaselines = DriftCheckBaselines;
  static DriftCheckBias = DriftCheckBias;
  static DriftCheckExplainability = DriftCheckExplainability;
  static DriftCheckModelDataQuality = DriftCheckModelDataQuality;
  static DriftCheckModelQuality = DriftCheckModelQuality;
  static Explainability = Explainability;
  static FileSource = FileSource;
  static InferenceSpecification = InferenceSpecification;
  static MetadataProperties = MetadataProperties;
  static MetricsSource = MetricsSource;
  static ModelAccessConfig = ModelAccessConfig;
  static ModelCard = ModelCard;
  static ModelDataQuality = ModelDataQuality;
  static ModelDataSource = ModelDataSource;
  static ModelInput = ModelInput;
  static ModelMetrics = ModelMetrics;
  static ModelPackageContainerDefinition = ModelPackageContainerDefinition;
  static ModelPackageStatusDetails = ModelPackageStatusDetails;
  static ModelPackageStatusItem = ModelPackageStatusItem;
  static ModelQuality = ModelQuality;
  static S3DataSource = S3DataSource;
  static S3ModelDataSource = S3ModelDataSource;
  static SecurityConfig = SecurityConfig;
  static SourceAlgorithm = SourceAlgorithm;
  static SourceAlgorithmSpecification = SourceAlgorithmSpecification;
  static TransformInput = TransformInput;
  static TransformJobDefinition = TransformJobDefinition;
  static TransformOutput = TransformOutput;
  static TransformResources = TransformResources;
  static ValidationProfile = ValidationProfile;
  static ValidationSpecification = ValidationSpecification;
  constructor(properties?: ModelPackageProperties) {
    super('AWS::SageMaker::ModelPackage', properties || {});
  }
}
