import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class ColumnWildcard {
  ExcludedColumnNames?: List<Value<string>>;
  constructor(properties: ColumnWildcard) {
    Object.assign(this, properties);
  }
}

export class DataCellsFilterResource {
  TableName!: Value<string>;
  DatabaseName!: Value<string>;
  TableCatalogId!: Value<string>;
  Name!: Value<string>;
  constructor(properties: DataCellsFilterResource) {
    Object.assign(this, properties);
  }
}

export class DataLakePrincipal {
  DataLakePrincipalIdentifier?: Value<string>;
  constructor(properties: DataLakePrincipal) {
    Object.assign(this, properties);
  }
}

export class DataLocationResource {
  ResourceArn!: Value<string>;
  CatalogId!: Value<string>;
  constructor(properties: DataLocationResource) {
    Object.assign(this, properties);
  }
}

export class DatabaseResource {
  CatalogId!: Value<string>;
  Name!: Value<string>;
  constructor(properties: DatabaseResource) {
    Object.assign(this, properties);
  }
}

export class LFTag {
  TagKey?: Value<string>;
  TagValues?: List<Value<string>>;
  constructor(properties: LFTag) {
    Object.assign(this, properties);
  }
}

export class LFTagKeyResource {
  TagKey!: Value<string>;
  CatalogId!: Value<string>;
  TagValues!: List<Value<string>>;
  constructor(properties: LFTagKeyResource) {
    Object.assign(this, properties);
  }
}

export class LFTagPolicyResource {
  Expression!: List<LFTag>;
  ResourceType!: Value<string>;
  CatalogId!: Value<string>;
  constructor(properties: LFTagPolicyResource) {
    Object.assign(this, properties);
  }
}

export class Resource {
  LFTag?: LFTagKeyResource;
  Table?: TableResource;
  DataCellsFilter?: DataCellsFilterResource;
  TableWithColumns?: TableWithColumnsResource;
  LFTagPolicy?: LFTagPolicyResource;
  Database?: DatabaseResource;
  DataLocation?: DataLocationResource;
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
  ColumnNames?: List<Value<string>>;
  DatabaseName!: Value<string>;
  CatalogId!: Value<string>;
  Name!: Value<string>;
  ColumnWildcard?: ColumnWildcard;
  constructor(properties: TableWithColumnsResource) {
    Object.assign(this, properties);
  }
}
export interface PrincipalPermissionsProperties {
  Resource: Resource;
  Permissions: List<Value<string>>;
  Catalog?: Value<string>;
  Principal: DataLakePrincipal;
  PermissionsWithGrantOption: List<Value<string>>;
}
export default class PrincipalPermissions extends ResourceBase<PrincipalPermissionsProperties> {
  static ColumnWildcard = ColumnWildcard;
  static DataCellsFilterResource = DataCellsFilterResource;
  static DataLakePrincipal = DataLakePrincipal;
  static DataLocationResource = DataLocationResource;
  static DatabaseResource = DatabaseResource;
  static LFTag = LFTag;
  static LFTagKeyResource = LFTagKeyResource;
  static LFTagPolicyResource = LFTagPolicyResource;
  static Resource = Resource;
  static TableResource = TableResource;
  static TableWithColumnsResource = TableWithColumnsResource;
  constructor(properties: PrincipalPermissionsProperties) {
    super('AWS::LakeFormation::PrincipalPermissions', properties);
  }
}
