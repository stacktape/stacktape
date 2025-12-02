import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface TablePolicyProperties {
  TableARN: Value<string>;
  ResourcePolicy: { [key: string]: any };
}
export default class TablePolicy extends ResourceBase<TablePolicyProperties> {
  constructor(properties: TablePolicyProperties) {
    super('AWS::S3Tables::TablePolicy', properties);
  }
}
