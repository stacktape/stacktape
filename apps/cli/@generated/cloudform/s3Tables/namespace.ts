import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface NamespaceProperties {
  TableBucketARN: Value<string>;
  Namespace: Value<string>;
}
export default class Namespace extends ResourceBase<NamespaceProperties> {
  constructor(properties: NamespaceProperties) {
    super('AWS::S3Tables::Namespace', properties);
  }
}
