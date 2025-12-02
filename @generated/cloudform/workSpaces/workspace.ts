import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class WorkspaceProperties {
  ComputeTypeName?: Value<string>;
  RootVolumeSizeGib?: Value<number>;
  RunningMode?: Value<string>;
  RunningModeAutoStopTimeoutInMinutes?: Value<number>;
  UserVolumeSizeGib?: Value<number>;
  constructor(properties: WorkspaceProperties) {
    Object.assign(this, properties);
  }
}
export interface WorkspaceProperties {
  BundleId: Value<string>;
  DirectoryId: Value<string>;
  RootVolumeEncryptionEnabled?: Value<boolean>;
  Tags?: List<ResourceTag>;
  UserName: Value<string>;
  UserVolumeEncryptionEnabled?: Value<boolean>;
  VolumeEncryptionKey?: Value<string>;
  WorkspaceProperties?: WorkspaceProperties;
}
export default class Workspace extends ResourceBase<WorkspaceProperties> {
  static WorkspaceProperties = WorkspaceProperties;
  constructor(properties: WorkspaceProperties) {
    super('AWS::WorkSpaces::Workspace', properties);
  }
}
