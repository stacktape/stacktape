import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class TelemetryPipeline {
  Status?: Value<string>;
  LastUpdateTimeStamp?: Value<number>;
  CreatedTimeStamp?: Value<number>;
  Configuration?: TelemetryPipelineConfiguration;
  StatusReason?: TelemetryPipelineStatusReason;
  Arn?: Value<string>;
  Tags?: List<ResourceTag>;
  Name?: Value<string>;
  constructor(properties: TelemetryPipeline) {
    Object.assign(this, properties);
  }
}

export class TelemetryPipelineConfiguration {
  Body!: Value<string>;
  constructor(properties: TelemetryPipelineConfiguration) {
    Object.assign(this, properties);
  }
}

export class TelemetryPipelineStatusReason {
  Description?: Value<string>;
  constructor(properties: TelemetryPipelineStatusReason) {
    Object.assign(this, properties);
  }
}
export interface TelemetryPipelinesProperties {
  Configuration: TelemetryPipelineConfiguration;
  Tags?: List<ResourceTag>;
  Name?: Value<string>;
}
export default class TelemetryPipelines extends ResourceBase<TelemetryPipelinesProperties> {
  static TelemetryPipeline = TelemetryPipeline;
  static TelemetryPipelineConfiguration = TelemetryPipelineConfiguration;
  static TelemetryPipelineStatusReason = TelemetryPipelineStatusReason;
  constructor(properties: TelemetryPipelinesProperties) {
    super('AWS::ObservabilityAdmin::TelemetryPipelines', properties);
  }
}
