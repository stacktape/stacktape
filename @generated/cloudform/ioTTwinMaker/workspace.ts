import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface WorkspaceProperties {
  Role: Value<string>;
  Description?: Value<string>;
  WorkspaceId: Value<string>;
  S3Location: Value<string>;
  Tags?: { [key: string]: Value<string> };
}
export default class Workspace extends ResourceBase<WorkspaceProperties> {
  constructor(properties: WorkspaceProperties) {
    super('AWS::IoTTwinMaker::Workspace', properties);
  }
}
