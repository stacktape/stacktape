import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class ParallelismConfiguration {
  MaxParallelExecutionSteps!: Value<number>;
  constructor(properties: ParallelismConfiguration) {
    Object.assign(this, properties);
  }
}

export class PipelineDefinition {
  PipelineDefinitionBody?: Value<string>;
  PipelineDefinitionS3Location?: S3Location;
  constructor(properties: PipelineDefinition) {
    Object.assign(this, properties);
  }
}

export class S3Location {
  Bucket!: Value<string>;
  Version?: Value<string>;
  ETag?: Value<string>;
  Key!: Value<string>;
  constructor(properties: S3Location) {
    Object.assign(this, properties);
  }
}
export interface PipelineProperties {
  PipelineName: Value<string>;
  ParallelismConfiguration?: ParallelismConfiguration;
  PipelineDescription?: Value<string>;
  PipelineDisplayName?: Value<string>;
  PipelineDefinition: PipelineDefinition;
  RoleArn: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class Pipeline extends ResourceBase<PipelineProperties> {
  static ParallelismConfiguration = ParallelismConfiguration;
  static PipelineDefinition = PipelineDefinition;
  static S3Location = S3Location;
  constructor(properties: PipelineProperties) {
    super('AWS::SageMaker::Pipeline', properties);
  }
}
