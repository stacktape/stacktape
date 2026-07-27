import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface DomainUnitProperties {
  Description?: Value<string>;
  ParentDomainUnitIdentifier: Value<string>;
  DomainIdentifier: Value<string>;
  Name: Value<string>;
}
export default class DomainUnit extends ResourceBase<DomainUnitProperties> {
  constructor(properties: DomainUnitProperties) {
    super('AWS::DataZone::DomainUnit', properties);
  }
}
