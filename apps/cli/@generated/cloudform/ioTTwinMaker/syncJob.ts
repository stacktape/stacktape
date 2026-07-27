import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface SyncJobProperties {
  SyncSource: Value<string>;
  SyncRole: Value<string>;
  WorkspaceId: Value<string>;
  Tags?: { [key: string]: Value<string> };
}
export default class SyncJob extends ResourceBase<SyncJobProperties> {
  constructor(properties: SyncJobProperties) {
    super('AWS::IoTTwinMaker::SyncJob', properties);
  }
}
