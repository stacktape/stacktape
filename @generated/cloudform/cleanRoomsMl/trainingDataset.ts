import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class ColumnSchema {
  ColumnName!: Value<string>;
  ColumnTypes!: List<Value<string>>;
  constructor(properties: ColumnSchema) {
    Object.assign(this, properties);
  }
}

export class DataSource {
  GlueDataSource!: GlueDataSource;
  constructor(properties: DataSource) {
    Object.assign(this, properties);
  }
}

export class Dataset {
  Type!: Value<string>;
  InputConfig!: DatasetInputConfig;
  constructor(properties: Dataset) {
    Object.assign(this, properties);
  }
}

export class DatasetInputConfig {
  Schema!: List<ColumnSchema>;
  DataSource!: DataSource;
  constructor(properties: DatasetInputConfig) {
    Object.assign(this, properties);
  }
}

export class GlueDataSource {
  TableName!: Value<string>;
  DatabaseName!: Value<string>;
  CatalogId?: Value<string>;
  constructor(properties: GlueDataSource) {
    Object.assign(this, properties);
  }
}
export interface TrainingDatasetProperties {
  Description?: Value<string>;
  TrainingData: List<Dataset>;
  RoleArn: Value<string>;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
}
export default class TrainingDataset extends ResourceBase<TrainingDatasetProperties> {
  static ColumnSchema = ColumnSchema;
  static DataSource = DataSource;
  static Dataset = Dataset;
  static DatasetInputConfig = DatasetInputConfig;
  static GlueDataSource = GlueDataSource;
  constructor(properties: TrainingDatasetProperties) {
    super('AWS::CleanRoomsML::TrainingDataset', properties);
  }
}
