import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface DomainProperties {
  Description?: Value<string>;
}
export default class Domain extends ResourceBase<DomainProperties> {
  constructor(properties?: DomainProperties) {
    super('AWS::SDB::Domain', properties || {});
  }
}
