import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AutoExportPolicy {
  Events!: List<Value<string>>;
  constructor(properties: AutoExportPolicy) {
    Object.assign(this, properties);
  }
}

export class AutoImportPolicy {
  Events!: List<Value<string>>;
  constructor(properties: AutoImportPolicy) {
    Object.assign(this, properties);
  }
}

export class S3 {
  AutoImportPolicy?: AutoImportPolicy;
  AutoExportPolicy?: AutoExportPolicy;
  constructor(properties: S3) {
    Object.assign(this, properties);
  }
}
export interface DataRepositoryAssociationProperties {
  FileSystemPath: Value<string>;
  DataRepositoryPath: Value<string>;
  BatchImportMetaDataOnCreate?: Value<boolean>;
  S3?: S3;
  FileSystemId: Value<string>;
  ImportedFileChunkSize?: Value<number>;
  Tags?: List<ResourceTag>;
}
export default class DataRepositoryAssociation extends ResourceBase<DataRepositoryAssociationProperties> {
  static AutoExportPolicy = AutoExportPolicy;
  static AutoImportPolicy = AutoImportPolicy;
  static S3 = S3;
  constructor(properties: DataRepositoryAssociationProperties) {
    super('AWS::FSx::DataRepositoryAssociation', properties);
  }
}
