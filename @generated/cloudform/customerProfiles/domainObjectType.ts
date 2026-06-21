import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class DomainObjectTypeField {
  FeatureType?: Value<string>;
  Target!: Value<string>;
  ContentType?: Value<string>;
  Source!: Value<string>;
  constructor(properties: DomainObjectTypeField) {
    Object.assign(this, properties);
  }
}
export interface DomainObjectTypeProperties {
  Description?: Value<string>;
  Fields: { [key: string]: DomainObjectTypeField };
  DomainName: Value<string>;
  ObjectTypeName: Value<string>;
  EncryptionKey?: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class DomainObjectType extends ResourceBase<DomainObjectTypeProperties> {
  static DomainObjectTypeField = DomainObjectTypeField;
  constructor(properties: DomainObjectTypeProperties) {
    super('AWS::CustomerProfiles::DomainObjectType', properties);
  }
}
