import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class ContainerRegistryMap {
  RegistryMappings?: List<RegistryMapping>;
  ImageMappings?: List<ImageMapping>;
  constructor(properties: ContainerRegistryMap) {
    Object.assign(this, properties);
  }
}

export class DefinitionRepository {
  sourceReference?: SourceReference;
  fullRepositoryId?: Value<string>;
  excludeFilePatterns?: List<Value<string>>;
  connectionArn?: Value<string>;
  constructor(properties: DefinitionRepository) {
    Object.assign(this, properties);
  }
}

export class ImageMapping {
  SourceImage?: Value<string>;
  DestinationImage?: Value<string>;
  constructor(properties: ImageMapping) {
    Object.assign(this, properties);
  }
}

export class RegistryMapping {
  UpstreamRegistryUrl?: Value<string>;
  EcrAccountId?: Value<string>;
  UpstreamRepositoryPrefix?: Value<string>;
  EcrRepositoryPrefix?: Value<string>;
  constructor(properties: RegistryMapping) {
    Object.assign(this, properties);
  }
}

export class SourceReference {
  type?: Value<string>;
  value?: Value<string>;
  constructor(properties: SourceReference) {
    Object.assign(this, properties);
  }
}

export class WorkflowParameter {
  Description?: Value<string>;
  Optional?: Value<boolean>;
  constructor(properties: WorkflowParameter) {
    Object.assign(this, properties);
  }
}
export interface WorkflowVersionProperties {
  ParameterTemplate?: { [key: string]: WorkflowParameter };
  Description?: Value<string>;
  StorageType?: Value<string>;
  ContainerRegistryMap?: ContainerRegistryMap;
  StorageCapacity?: Value<number>;
  WorkflowId: Value<string>;
  DefinitionUri?: Value<string>;
  ParameterTemplatePath?: Value<string>;
  readmeMarkdown?: Value<string>;
  DefinitionRepository?: DefinitionRepository;
  Accelerators?: Value<string>;
  WorkflowBucketOwnerId?: Value<string>;
  readmePath?: Value<string>;
  VersionName: Value<string>;
  ContainerRegistryMapUri?: Value<string>;
  Main?: Value<string>;
  Engine?: Value<string>;
  Tags?: { [key: string]: Value<string> };
  readmeUri?: Value<string>;
}
export default class WorkflowVersion extends ResourceBase<WorkflowVersionProperties> {
  static ContainerRegistryMap = ContainerRegistryMap;
  static DefinitionRepository = DefinitionRepository;
  static ImageMapping = ImageMapping;
  static RegistryMapping = RegistryMapping;
  static SourceReference = SourceReference;
  static WorkflowParameter = WorkflowParameter;
  constructor(properties: WorkflowVersionProperties) {
    super('AWS::Omics::WorkflowVersion', properties);
  }
}
