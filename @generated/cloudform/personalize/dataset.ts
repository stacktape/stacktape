import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class DataSource {
  DataLocation?: Value<string>;
  constructor(properties: DataSource) {
    Object.assign(this, properties);
  }
}

export class DatasetImportJob {
  DatasetArn?: Value<string>;
  JobName?: Value<string>;
  DatasetImportJobArn?: Value<string>;
  RoleArn?: Value<string>;
  DataSource?: DataSource;
  constructor(properties: DatasetImportJob) {
    Object.assign(this, properties);
  }
}
export interface DatasetProperties {
  DatasetGroupArn: Value<string>;
  DatasetType: Value<string>;
  DatasetImportJob?: DatasetImportJob;
  SchemaArn: Value<string>;
  Name: Value<string>;
}
export default class Dataset extends ResourceBase<DatasetProperties> {
  static DataSource = DataSource;
  static DatasetImportJob = DatasetImportJob;
  constructor(properties: DatasetProperties) {
    super('AWS::Personalize::Dataset', properties);
  }
}
