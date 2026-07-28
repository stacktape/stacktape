import { ResourceBase, ResourceTag } from '../resource';
import { Value, List as CfnList } from '../dataTypes';

export interface ListProperties {
  Description?: Value<string>;
  VariableType?: Value<string>;
  Elements?: CfnList<Value<string>>;
  Tags?: CfnList<ResourceTag>;
  Name: Value<string>;
}
export default class List extends ResourceBase<ListProperties> {
  constructor(properties: ListProperties) {
    super('AWS::FraudDetector::List', properties);
  }
}
