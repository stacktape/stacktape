import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class DatabaseResource {
  CatalogId!: Value<string>;
  Name!: Value<string>;
  constructor(properties: DatabaseResource) {
    Object.assign(this, properties);
  }
}

export class LFTagPair {
  TagKey!: Value<string>;
  CatalogId!: Value<string>;
  TagValues!: List<Value<string>>;
  constructor(properties: LFTagPair) {
    Object.assign(this, properties);
  }
}

export class Resource {
  Table?: TableResource;
  TableWithColumns?: TableWithColumnsResource;
  Database?: DatabaseResource;
  Catalog?: { [key: string]: any };
  constructor(properties: Resource) {
    Object.assign(this, properties);
  }
}

export class TableResource {
  DatabaseName!: Value<string>;
  CatalogId!: Value<string>;
  TableWildcard?: { [key: string]: any };
  Name?: Value<string>;
  constructor(properties: TableResource) {
    Object.assign(this, properties);
  }
}

export class TableWithColumnsResource {
  ColumnNames!: List<Value<string>>;
  DatabaseName!: Value<string>;
  CatalogId!: Value<string>;
  Name!: Value<string>;
  constructor(properties: TableWithColumnsResource) {
    Object.assign(this, properties);
  }
}
export interface TagAssociationProperties {
  LFTags: List<LFTagPair>;
  Resource: Resource;
}
export default class TagAssociation extends ResourceBase<TagAssociationProperties> {
  static DatabaseResource = DatabaseResource;
  static LFTagPair = LFTagPair;
  static Resource = Resource;
  static TableResource = TableResource;
  static TableWithColumnsResource = TableWithColumnsResource;
  constructor(properties: TagAssociationProperties) {
    super('AWS::LakeFormation::TagAssociation', properties);
  }
}
