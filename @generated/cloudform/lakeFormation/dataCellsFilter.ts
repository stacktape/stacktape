import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class ColumnWildcard {
  ExcludedColumnNames?: List<Value<string>>;
  constructor(properties: ColumnWildcard) {
    Object.assign(this, properties);
  }
}

export class RowFilter {
  AllRowsWildcard?: { [key: string]: any };
  FilterExpression?: Value<string>;
  constructor(properties: RowFilter) {
    Object.assign(this, properties);
  }
}
export interface DataCellsFilterProperties {
  TableName: Value<string>;
  ColumnNames?: List<Value<string>>;
  RowFilter?: RowFilter;
  DatabaseName: Value<string>;
  TableCatalogId: Value<string>;
  Name: Value<string>;
  ColumnWildcard?: ColumnWildcard;
}
export default class DataCellsFilter extends ResourceBase<DataCellsFilterProperties> {
  static ColumnWildcard = ColumnWildcard;
  static RowFilter = RowFilter;
  constructor(properties: DataCellsFilterProperties) {
    super('AWS::LakeFormation::DataCellsFilter', properties);
  }
}
