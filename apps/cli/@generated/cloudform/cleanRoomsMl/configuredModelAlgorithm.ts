import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class ContainerConfig {
  Entrypoint?: List<Value<string>>;
  Arguments?: List<Value<string>>;
  MetricDefinitions?: List<MetricDefinition>;
  ImageUri!: Value<string>;
  constructor(properties: ContainerConfig) {
    Object.assign(this, properties);
  }
}

export class InferenceContainerConfig {
  ImageUri!: Value<string>;
  constructor(properties: InferenceContainerConfig) {
    Object.assign(this, properties);
  }
}

export class MetricDefinition {
  Regex!: Value<string>;
  Name!: Value<string>;
  constructor(properties: MetricDefinition) {
    Object.assign(this, properties);
  }
}
export interface ConfiguredModelAlgorithmProperties {
  Description?: Value<string>;
  KmsKeyArn?: Value<string>;
  InferenceContainerConfig?: InferenceContainerConfig;
  RoleArn: Value<string>;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
  TrainingContainerConfig?: ContainerConfig;
}
export default class ConfiguredModelAlgorithm extends ResourceBase<ConfiguredModelAlgorithmProperties> {
  static ContainerConfig = ContainerConfig;
  static InferenceContainerConfig = InferenceContainerConfig;
  static MetricDefinition = MetricDefinition;
  constructor(properties: ConfiguredModelAlgorithmProperties) {
    super('AWS::CleanRoomsML::ConfiguredModelAlgorithm', properties);
  }
}
