import { ResourceBase } from '../resource';
import { Value as CfnValue, List } from '../dataTypes';
export class DataTableRecordInner {
  PrimaryValues?: List<Value>;
  Values!: List<Value>;
  constructor(properties: DataTableRecordInner) {
    Object.assign(this, properties);
  }
}

export class Value {
  AttributeValue?: CfnValue<string>;
  AttributeId?: CfnValue<string>;
  constructor(properties: Value) {
    Object.assign(this, properties);
  }
}
export interface DataTableRecordProperties {
  DataTableRecord?: DataTableRecord;
  InstanceArn?: CfnValue<string>;
  DataTableArn?: CfnValue<string>;
}
export default class DataTableRecord extends ResourceBase<DataTableRecordProperties> {
  static DataTableRecord = DataTableRecordInner;
  static Value = Value;
  constructor(properties?: DataTableRecordProperties) {
    super('AWS::Connect::DataTableRecord', properties || {});
  }
}
