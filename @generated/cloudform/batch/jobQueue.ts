import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class ComputeEnvironmentOrder {
  ComputeEnvironment!: Value<string>;
  Order!: Value<number>;
  constructor(properties: ComputeEnvironmentOrder) {
    Object.assign(this, properties);
  }
}

export class JobStateTimeLimitAction {
  Action!: Value<string>;
  MaxTimeSeconds!: Value<number>;
  State!: Value<string>;
  Reason!: Value<string>;
  constructor(properties: JobStateTimeLimitAction) {
    Object.assign(this, properties);
  }
}

export class ServiceEnvironmentOrder {
  Order!: Value<number>;
  ServiceEnvironment!: Value<string>;
  constructor(properties: ServiceEnvironmentOrder) {
    Object.assign(this, properties);
  }
}
export interface JobQueueProperties {
  ComputeEnvironmentOrder?: List<ComputeEnvironmentOrder>;
  Priority: Value<number>;
  State?: Value<string>;
  JobQueueType?: Value<string>;
  ServiceEnvironmentOrder?: List<ServiceEnvironmentOrder>;
  SchedulingPolicyArn?: Value<string>;
  JobStateTimeLimitActions?: List<JobStateTimeLimitAction>;
  JobQueueName?: Value<string>;
  Tags?: { [key: string]: Value<string> };
}
export default class JobQueue extends ResourceBase<JobQueueProperties> {
  static ComputeEnvironmentOrder = ComputeEnvironmentOrder;
  static JobStateTimeLimitAction = JobStateTimeLimitAction;
  static ServiceEnvironmentOrder = ServiceEnvironmentOrder;
  constructor(properties: JobQueueProperties) {
    super('AWS::Batch::JobQueue', properties);
  }
}
