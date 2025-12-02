import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class ColumnWildcard {
  ExcludedColumnNames?: List<Value<string>>;
  constructor(properties: ColumnWildcard) {
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
  S3Resource?: Value<string>;
  CatalogId?: Value<string>;
  constructor(properties: DataLocationResource) {
    Object.assign(this, properties);
  }
}

export class DatabaseResource {
  CatalogId?: Value<string>;
  Name?: Value<string>;
  constructor(properties: DatabaseResource) {
    Object.assign(this, properties);
  }
}

export class Resource {
  TableResource?: TableResource;
  DatabaseResource?: DatabaseResource;
  DataLocationResource?: DataLocationResource;
  TableWithColumnsResource?: TableWithColumnsResource;
  constructor(properties: Resource) {
    Object.assign(this, properties);
  }
}

export class TableResource {
  DatabaseName?: Value<string>;
  CatalogId?: Value<string>;
  TableWildcard?: TableWildcard;
  Name?: Value<string>;
  constructor(properties: TableResource) {
    Object.assign(this, properties);
  }
}

export class TableWildcard {
  constructor(properties: TableWildcard) {
    Object.assign(this, properties);
  }
}

export class TableWithColumnsResource {
  ColumnNames?: List<Value<string>>;
  DatabaseName?: Value<string>;
  CatalogId?: Value<string>;
  Name?: Value<string>;
  ColumnWildcard?: ColumnWildcard;
  constructor(properties: TableWithColumnsResource) {
    Object.assign(this, properties);
  }
}
export interface PermissionsProperties {
  DataLakePrincipal: DataLakePrincipal;
  Resource: Resource;
  Permissions?: List<Value<string>>;
  PermissionsWithGrantOption?: List<Value<string>>;
}
export default class Permissions extends ResourceBase<PermissionsProperties> {
  static ColumnWildcard = ColumnWildcard;
  static DataLakePrincipal = DataLakePrincipal;
  static DataLocationResource = DataLocationResource;
  static DatabaseResource = DatabaseResource;
  static Resource = Resource;
  static TableResource = TableResource;
  static TableWildcard = TableWildcard;
  static TableWithColumnsResource = TableWithColumnsResource;
  constructor(properties: PermissionsProperties) {
    super('AWS::LakeFormation::Permissions', properties);
  }
}
