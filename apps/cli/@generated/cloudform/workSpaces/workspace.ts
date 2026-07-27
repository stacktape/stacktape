import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class WorkspaceProperties {
  RootVolumeSizeGib?: Value<number>;
  ComputeTypeName?: Value<string>;
  UserVolumeSizeGib?: Value<number>;
  RunningModeAutoStopTimeoutInMinutes?: Value<number>;
  RunningMode?: Value<string>;
  constructor(properties: WorkspaceProperties) {
    Object.assign(this, properties);
  }
}
export interface WorkspaceProperties {
  UserVolumeEncryptionEnabled?: Value<boolean>;
  BundleId: Value<string>;
  DirectoryId: Value<string>;
  UserName: Value<string>;
  RootVolumeEncryptionEnabled?: Value<boolean>;
  VolumeEncryptionKey?: Value<string>;
  WorkspaceProperties?: WorkspaceProperties;
  Tags?: List<ResourceTag>;
}
export default class Workspace extends ResourceBase<WorkspaceProperties> {
  static WorkspaceProperties = WorkspaceProperties;
  constructor(properties: WorkspaceProperties) {
    super('AWS::WorkSpaces::Workspace', properties);
  }
}
