import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface DatasetGroupProperties {
  KmsKeyArn?: Value<string>;
  Domain?: Value<string>;
  RoleArn?: Value<string>;
  Name: Value<string>;
}
export default class DatasetGroup extends ResourceBase<DatasetGroupProperties> {
  constructor(properties: DatasetGroupProperties) {
    super('AWS::Personalize::DatasetGroup', properties);
  }
}
