import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class FieldMap {
  Name?: Value<string>;
  ObjectTypeField?: ObjectTypeField;
  constructor(properties: FieldMap) {
    Object.assign(this, properties);
  }
}

export class KeyMap {
  ObjectTypeKeyList?: List<ObjectTypeKey>;
  Name?: Value<string>;
  constructor(properties: KeyMap) {
    Object.assign(this, properties);
  }
}

export class ObjectTypeField {
  Target?: Value<string>;
  ContentType?: Value<string>;
  Source?: Value<string>;
  constructor(properties: ObjectTypeField) {
    Object.assign(this, properties);
  }
}

export class ObjectTypeKey {
  FieldNames?: List<Value<string>>;
  StandardIdentifiers?: List<Value<string>>;
  constructor(properties: ObjectTypeKey) {
    Object.assign(this, properties);
  }
}
export interface ObjectTypeProperties {
  MaxProfileObjectCount?: Value<number>;
  Description: Value<string>;
  Fields?: List<FieldMap>;
  DomainName: Value<string>;
  AllowProfileCreation?: Value<boolean>;
  ObjectTypeName: Value<string>;
  Keys?: List<KeyMap>;
  SourceLastUpdatedTimestampFormat?: Value<string>;
  EncryptionKey?: Value<string>;
  Tags?: List<ResourceTag>;
  TemplateId?: Value<string>;
  ExpirationDays?: Value<number>;
}
export default class ObjectType extends ResourceBase<ObjectTypeProperties> {
  static FieldMap = FieldMap;
  static KeyMap = KeyMap;
  static ObjectTypeField = ObjectTypeField;
  static ObjectTypeKey = ObjectTypeKey;
  constructor(properties: ObjectTypeProperties) {
    super('AWS::CustomerProfiles::ObjectType', properties);
  }
}
