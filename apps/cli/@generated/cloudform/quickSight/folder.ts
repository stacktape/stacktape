import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class ResourcePermission {
  Actions!: List<Value<string>>;
  Principal!: Value<string>;
  constructor(properties: ResourcePermission) {
    Object.assign(this, properties);
  }
}
export interface FolderProperties {
  SharingModel?: Value<string>;
  AwsAccountId?: Value<string>;
  Permissions?: List<ResourcePermission>;
  FolderId?: Value<string>;
  ParentFolderArn?: Value<string>;
  Tags?: List<ResourceTag>;
  FolderType?: Value<string>;
  Name?: Value<string>;
}
export default class Folder extends ResourceBase<FolderProperties> {
  static ResourcePermission = ResourcePermission;
  constructor(properties?: FolderProperties) {
    super('AWS::QuickSight::Folder', properties || {});
  }
}
