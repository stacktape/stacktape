import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface DomainProperties {
  Tags?: List<ResourceTag>;
  Name: Value<string>;
}
export default class Domain extends ResourceBase<DomainProperties> {
  constructor(properties: DomainProperties) {
    super('AWS::Cases::Domain', properties);
  }
}
