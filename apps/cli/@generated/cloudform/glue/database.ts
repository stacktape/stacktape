import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class DataLakePrincipal {
  DataLakePrincipalIdentifier?: Value<string>;
  constructor(properties: DataLakePrincipal) {
    Object.assign(this, properties);
  }
}

export class DatabaseIdentifier {
  DatabaseName?: Value<string>;
  Region?: Value<string>;
  CatalogId?: Value<string>;
  constructor(properties: DatabaseIdentifier) {
    Object.assign(this, properties);
  }
}

export class DatabaseInput {
  LocationUri?: Value<string>;
  CreateTableDefaultPermissions?: List<PrincipalPrivileges>;
  Description?: Value<string>;
  Parameters?: { [key: string]: any };
  TargetDatabase?: DatabaseIdentifier;
  FederatedDatabase?: FederatedDatabase;
  Name?: Value<string>;
  constructor(properties: DatabaseInput) {
    Object.assign(this, properties);
  }
}

export class FederatedDatabase {
  ConnectionName?: Value<string>;
  Identifier?: Value<string>;
  constructor(properties: FederatedDatabase) {
    Object.assign(this, properties);
  }
}

export class PrincipalPrivileges {
  Permissions?: List<Value<string>>;
  Principal?: DataLakePrincipal;
  constructor(properties: PrincipalPrivileges) {
    Object.assign(this, properties);
  }
}
export interface DatabaseProperties {
  DatabaseName?: Value<string>;
  DatabaseInput: DatabaseInput;
  CatalogId: Value<string>;
}
export default class Database extends ResourceBase<DatabaseProperties> {
  static DataLakePrincipal = DataLakePrincipal;
  static DatabaseIdentifier = DatabaseIdentifier;
  static DatabaseInput = DatabaseInput;
  static FederatedDatabase = FederatedDatabase;
  static PrincipalPrivileges = PrincipalPrivileges;
  constructor(properties: DatabaseProperties) {
    super('AWS::Glue::Database', properties);
  }
}
