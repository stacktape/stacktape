import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class CsvOptions {
  Delimiter?: Value<string>;
  HeaderRow?: Value<boolean>;
  constructor(properties: CsvOptions) {
    Object.assign(this, properties);
  }
}

export class DataCatalogInputDefinition {
  TableName?: Value<string>;
  TempDirectory?: S3Location;
  DatabaseName?: Value<string>;
  CatalogId?: Value<string>;
  constructor(properties: DataCatalogInputDefinition) {
    Object.assign(this, properties);
  }
}

export class DatabaseInputDefinition {
  TempDirectory?: S3Location;
  QueryString?: Value<string>;
  GlueConnectionName!: Value<string>;
  DatabaseTableName?: Value<string>;
  constructor(properties: DatabaseInputDefinition) {
    Object.assign(this, properties);
  }
}

export class DatasetParameter {
  Type!: Value<string>;
  DatetimeOptions?: DatetimeOptions;
  Filter?: FilterExpression;
  CreateColumn?: Value<boolean>;
  Name!: Value<string>;
  constructor(properties: DatasetParameter) {
    Object.assign(this, properties);
  }
}

export class DatetimeOptions {
  LocaleCode?: Value<string>;
  Format!: Value<string>;
  TimezoneOffset?: Value<string>;
  constructor(properties: DatetimeOptions) {
    Object.assign(this, properties);
  }
}

export class ExcelOptions {
  HeaderRow?: Value<boolean>;
  SheetNames?: List<Value<string>>;
  SheetIndexes?: List<Value<number>>;
  constructor(properties: ExcelOptions) {
    Object.assign(this, properties);
  }
}

export class FilesLimit {
  Order?: Value<string>;
  OrderedBy?: Value<string>;
  MaxFiles!: Value<number>;
  constructor(properties: FilesLimit) {
    Object.assign(this, properties);
  }
}

export class FilterExpression {
  Expression!: Value<string>;
  ValuesMap!: List<FilterValue>;
  constructor(properties: FilterExpression) {
    Object.assign(this, properties);
  }
}

export class FilterValue {
  Value!: Value<string>;
  ValueReference!: Value<string>;
  constructor(properties: FilterValue) {
    Object.assign(this, properties);
  }
}

export class FormatOptions {
  Excel?: ExcelOptions;
  Csv?: CsvOptions;
  Json?: JsonOptions;
  constructor(properties: FormatOptions) {
    Object.assign(this, properties);
  }
}

export class Input {
  DatabaseInputDefinition?: DatabaseInputDefinition;
  S3InputDefinition?: S3Location;
  Metadata?: Metadata;
  DataCatalogInputDefinition?: DataCatalogInputDefinition;
  constructor(properties: Input) {
    Object.assign(this, properties);
  }
}

export class JsonOptions {
  MultiLine?: Value<boolean>;
  constructor(properties: JsonOptions) {
    Object.assign(this, properties);
  }
}

export class Metadata {
  SourceArn?: Value<string>;
  constructor(properties: Metadata) {
    Object.assign(this, properties);
  }
}

export class PathOptions {
  Parameters?: List<PathParameter>;
  LastModifiedDateCondition?: FilterExpression;
  FilesLimit?: FilesLimit;
  constructor(properties: PathOptions) {
    Object.assign(this, properties);
  }
}

export class PathParameter {
  PathParameterName!: Value<string>;
  DatasetParameter!: DatasetParameter;
  constructor(properties: PathParameter) {
    Object.assign(this, properties);
  }
}

export class S3Location {
  Bucket!: Value<string>;
  BucketOwner?: Value<string>;
  Key?: Value<string>;
  constructor(properties: S3Location) {
    Object.assign(this, properties);
  }
}
export interface DatasetProperties {
  Input: Input;
  Format?: Value<string>;
  FormatOptions?: FormatOptions;
  Source?: Value<string>;
  PathOptions?: PathOptions;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
}
export default class Dataset extends ResourceBase<DatasetProperties> {
  static CsvOptions = CsvOptions;
  static DataCatalogInputDefinition = DataCatalogInputDefinition;
  static DatabaseInputDefinition = DatabaseInputDefinition;
  static DatasetParameter = DatasetParameter;
  static DatetimeOptions = DatetimeOptions;
  static ExcelOptions = ExcelOptions;
  static FilesLimit = FilesLimit;
  static FilterExpression = FilterExpression;
  static FilterValue = FilterValue;
  static FormatOptions = FormatOptions;
  static Input = Input;
  static JsonOptions = JsonOptions;
  static Metadata = Metadata;
  static PathOptions = PathOptions;
  static PathParameter = PathParameter;
  static S3Location = S3Location;
  constructor(properties: DatasetProperties) {
    super('AWS::DataBrew::Dataset', properties);
  }
}
