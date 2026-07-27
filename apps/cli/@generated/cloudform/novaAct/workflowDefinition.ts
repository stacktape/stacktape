import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class WorkflowExportConfig {
  S3KeyPrefix?: Value<string>;
  S3BucketName!: Value<string>;
  constructor(properties: WorkflowExportConfig) {
    Object.assign(this, properties);
  }
}
export interface WorkflowDefinitionProperties {
  Description?: Value<string>;
  ExportConfig?: WorkflowExportConfig;
  Name: Value<string>;
}
export default class WorkflowDefinition extends ResourceBase<WorkflowDefinitionProperties> {
  static WorkflowExportConfig = WorkflowExportConfig;
  constructor(properties: WorkflowDefinitionProperties) {
    super('AWS::NovaAct::WorkflowDefinition', properties);
  }
}
