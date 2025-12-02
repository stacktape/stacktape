import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface OptOutListProperties {
  OptOutListName?: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class OptOutList extends ResourceBase<OptOutListProperties> {
  constructor(properties?: OptOutListProperties) {
    super('AWS::SMSVOICE::OptOutList', properties || {});
  }
}
