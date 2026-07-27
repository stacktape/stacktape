import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface TableBucketPolicyProperties {
  TableBucketARN: Value<string>;
  ResourcePolicy: { [key: string]: any };
}
export default class TableBucketPolicy extends ResourceBase<TableBucketPolicyProperties> {
  constructor(properties: TableBucketPolicyProperties) {
    super('AWS::S3Tables::TableBucketPolicy', properties);
  }
}
