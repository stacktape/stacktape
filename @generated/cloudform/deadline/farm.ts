import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface FarmProperties {
  Description?: Value<string>;
  KmsKeyArn?: Value<string>;
  DisplayName: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class Farm extends ResourceBase<FarmProperties> {
  constructor(properties: FarmProperties) {
    super('AWS::Deadline::Farm', properties);
  }
}
