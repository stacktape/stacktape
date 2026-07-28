import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface IndexProperties {
  Type: Value<string>;
  Tags?: { [key: string]: Value<string> };
}
export default class Index extends ResourceBase<IndexProperties> {
  constructor(properties: IndexProperties) {
    super('AWS::ResourceExplorer2::Index', properties);
  }
}
