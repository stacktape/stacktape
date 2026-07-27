import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class FileSystemLocation {
  Path!: Value<string>;
  Type!: Value<string>;
  Name!: Value<string>;
  constructor(properties: FileSystemLocation) {
    Object.assign(this, properties);
  }
}
export interface StorageProfileProperties {
  DisplayName: Value<string>;
  FileSystemLocations?: List<FileSystemLocation>;
  FarmId: Value<string>;
  OsFamily: Value<string>;
}
export default class StorageProfile extends ResourceBase<StorageProfileProperties> {
  static FileSystemLocation = FileSystemLocation;
  constructor(properties: StorageProfileProperties) {
    super('AWS::Deadline::StorageProfile', properties);
  }
}
