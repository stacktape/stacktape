import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface WorkflowProperties {
  Description?: Value<string>;
  DefaultRunProperties?: { [key: string]: any };
  Tags?: { [key: string]: any };
  Name?: Value<string>;
  MaxConcurrentRuns?: Value<number>;
}
export default class Workflow extends ResourceBase<WorkflowProperties> {
  constructor(properties?: WorkflowProperties) {
    super('AWS::Glue::Workflow', properties || {});
  }
}
