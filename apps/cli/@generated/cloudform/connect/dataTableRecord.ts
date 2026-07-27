import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class DataTableRecordInner {
  PrimaryValues?: List<Value>;
  Values!: List<Value>;
  constructor(properties: DataTableRecordInner) {
    Object.assign(this, properties);
  }
}

export class Value {
  AttributeValue?: Value<string>;
  AttributeId?: Value<string>;
  constructor(properties: Value) {
    Object.assign(this, properties);
  }
}
export interface DataTableRecordProperties {
  DataTableRecord?: DataTableRecord;
  InstanceArn?: Value<string>;
  DataTableArn?: Value<string>;
}
export default class DataTableRecord extends ResourceBase<DataTableRecordProperties> {
  static DataTableRecord = DataTableRecordInner;
  static Value = Value;
  constructor(properties?: DataTableRecordProperties) {
    super('AWS::Connect::DataTableRecord', properties || {});
  }
}
