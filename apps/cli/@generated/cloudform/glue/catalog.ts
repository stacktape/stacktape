import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class CatalogProperties {
  DataLakeAccessProperties?: DataLakeAccessProperties;
  CustomProperties?: { [key: string]: Value<string> };
  constructor(properties: CatalogProperties) {
    Object.assign(this, properties);
  }
}

export class DataLakeAccessProperties {
  RedshiftDatabaseName?: Value<string>;
  CatalogType?: Value<string>;
  DataTransferRole?: Value<string>;
  ManagedWorkgroupStatus?: Value<string>;
  AllowFullTableExternalDataAccess?: Value<string>;
  ManagedWorkgroupName?: Value<string>;
  DataLakeAccess?: Value<boolean>;
  KmsKey?: Value<string>;
  constructor(properties: DataLakeAccessProperties) {
    Object.assign(this, properties);
  }
}

export class DataLakePrincipal {
  DataLakePrincipalIdentifier?: Value<string>;
  constructor(properties: DataLakePrincipal) {
    Object.assign(this, properties);
  }
}

export class FederatedCatalog {
  ConnectionName?: Value<string>;
  Identifier?: Value<string>;
  constructor(properties: FederatedCatalog) {
    Object.assign(this, properties);
  }
}

export class PrincipalPermissions {
  Permissions?: List<Value<string>>;
  Principal?: DataLakePrincipal;
  constructor(properties: PrincipalPermissions) {
    Object.assign(this, properties);
  }
}

export class TargetRedshiftCatalog {
  CatalogArn!: Value<string>;
  constructor(properties: TargetRedshiftCatalog) {
    Object.assign(this, properties);
  }
}
export interface CatalogProperties {
  CreateTableDefaultPermissions?: List<PrincipalPermissions>;
  Description?: Value<string>;
  Parameters?: { [key: string]: Value<string> };
  TargetRedshiftCatalog?: TargetRedshiftCatalog;
  AllowFullTableExternalDataAccess?: Value<string>;
  OverwriteChildResourcePermissionsWithDefault?: Value<string>;
  FederatedCatalog?: FederatedCatalog;
  CreateDatabaseDefaultPermissions?: List<PrincipalPermissions>;
  CatalogProperties?: CatalogProperties;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
}
export default class Catalog extends ResourceBase<CatalogProperties> {
  static CatalogProperties = CatalogProperties;
  static DataLakeAccessProperties = DataLakeAccessProperties;
  static DataLakePrincipal = DataLakePrincipal;
  static FederatedCatalog = FederatedCatalog;
  static PrincipalPermissions = PrincipalPermissions;
  static TargetRedshiftCatalog = TargetRedshiftCatalog;
  constructor(properties: CatalogProperties) {
    super('AWS::Glue::Catalog', properties);
  }
}
