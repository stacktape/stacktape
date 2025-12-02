import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class SingleSignOn {
  Type?: Value<string>;
  UserAssignment?: Value<string>;
  IdcInstanceArn?: Value<string>;
  constructor(properties: SingleSignOn) {
    Object.assign(this, properties);
  }
}
export interface DomainProperties {
  DomainExecutionRole: Value<string>;
  KmsKeyIdentifier?: Value<string>;
  Description?: Value<string>;
  ServiceRole?: Value<string>;
  DomainVersion?: Value<string>;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
  SingleSignOn?: SingleSignOn;
}
export default class Domain extends ResourceBase<DomainProperties> {
  static SingleSignOn = SingleSignOn;
  constructor(properties: DomainProperties) {
    super('AWS::DataZone::Domain', properties);
  }
}
