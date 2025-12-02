import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AdditionalModelDataSource {
  ChannelName!: Value<string>;
  S3DataSource!: S3DataSource;
  constructor(properties: AdditionalModelDataSource) {
    Object.assign(this, properties);
  }
}

export class ContainerDefinition {
  ImageConfig?: ImageConfig;
  InferenceSpecificationName?: Value<string>;
  ContainerHostname?: Value<string>;
  ModelPackageName?: Value<string>;
  Mode?: Value<string>;
  Environment?: { [key: string]: any };
  ModelDataUrl?: Value<string>;
  Image?: Value<string>;
  ModelDataSource?: ModelDataSource;
  MultiModelConfig?: MultiModelConfig;
  constructor(properties: ContainerDefinition) {
    Object.assign(this, properties);
  }
}

export class HubAccessConfig {
  HubContentArn!: Value<string>;
  constructor(properties: HubAccessConfig) {
    Object.assign(this, properties);
  }
}

export class ImageConfig {
  RepositoryAuthConfig?: RepositoryAuthConfig;
  RepositoryAccessMode!: Value<string>;
  constructor(properties: ImageConfig) {
    Object.assign(this, properties);
  }
}

export class InferenceExecutionConfig {
  Mode!: Value<string>;
  constructor(properties: InferenceExecutionConfig) {
    Object.assign(this, properties);
  }
}

export class ModelAccessConfig {
  AcceptEula!: Value<boolean>;
  constructor(properties: ModelAccessConfig) {
    Object.assign(this, properties);
  }
}

export class ModelDataSource {
  S3DataSource!: S3DataSource;
  constructor(properties: ModelDataSource) {
    Object.assign(this, properties);
  }
}

export class MultiModelConfig {
  ModelCacheSetting?: Value<string>;
  constructor(properties: MultiModelConfig) {
    Object.assign(this, properties);
  }
}

export class RepositoryAuthConfig {
  RepositoryCredentialsProviderArn!: Value<string>;
  constructor(properties: RepositoryAuthConfig) {
    Object.assign(this, properties);
  }
}

export class S3DataSource {
  ModelAccessConfig?: ModelAccessConfig;
  S3Uri!: Value<string>;
  S3DataType!: Value<string>;
  CompressionType!: Value<string>;
  HubAccessConfig?: HubAccessConfig;
  constructor(properties: S3DataSource) {
    Object.assign(this, properties);
  }
}

export class VpcConfig {
  Subnets!: List<Value<string>>;
  SecurityGroupIds!: List<Value<string>>;
  constructor(properties: VpcConfig) {
    Object.assign(this, properties);
  }
}
export interface ModelProperties {
  ExecutionRoleArn?: Value<string>;
  EnableNetworkIsolation?: Value<boolean>;
  PrimaryContainer?: ContainerDefinition;
  ModelName?: Value<string>;
  VpcConfig?: VpcConfig;
  Containers?: List<ContainerDefinition>;
  InferenceExecutionConfig?: InferenceExecutionConfig;
  Tags?: List<ResourceTag>;
}
export default class Model extends ResourceBase<ModelProperties> {
  static AdditionalModelDataSource = AdditionalModelDataSource;
  static ContainerDefinition = ContainerDefinition;
  static HubAccessConfig = HubAccessConfig;
  static ImageConfig = ImageConfig;
  static InferenceExecutionConfig = InferenceExecutionConfig;
  static ModelAccessConfig = ModelAccessConfig;
  static ModelDataSource = ModelDataSource;
  static MultiModelConfig = MultiModelConfig;
  static RepositoryAuthConfig = RepositoryAuthConfig;
  static S3DataSource = S3DataSource;
  static VpcConfig = VpcConfig;
  constructor(properties?: ModelProperties) {
    super('AWS::SageMaker::Model', properties || {});
  }
}
