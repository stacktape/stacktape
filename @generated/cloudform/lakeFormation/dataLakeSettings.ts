import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export type Admins = List<DataLakePrincipal>;

export type CreateDatabaseDefaultPermissions = List<PrincipalPermissions>;

export type CreateTableDefaultPermissions = List<PrincipalPermissions>;

export class DataLakePrincipal {
  DataLakePrincipalIdentifier!: Value<string>;
  constructor(properties: DataLakePrincipal) {
    Object.assign(this, properties);
  }
}

export type ExternalDataFilteringAllowList = List<DataLakePrincipal>;

export class PrincipalPermissions {
  Permissions!: List<Value<string>>;
  Principal!: DataLakePrincipal;
  constructor(properties: PrincipalPermissions) {
    Object.assign(this, properties);
  }
}
export interface DataLakeSettingsProperties {
  AllowExternalDataFiltering?: Value<boolean>;
  ExternalDataFilteringAllowList?: ExternalDataFilteringAllowList;
  CreateTableDefaultPermissions?: CreateTableDefaultPermissions;
  MutationType?: Value<string>;
  Parameters?: { [key: string]: any };
  AllowFullTableExternalDataAccess?: Value<boolean>;
  Admins?: Admins;
  CreateDatabaseDefaultPermissions?: CreateDatabaseDefaultPermissions;
  AuthorizedSessionTagValueList?: List<Value<string>>;
  TrustedResourceOwners?: List<Value<string>>;
}
export default class DataLakeSettings extends ResourceBase<DataLakeSettingsProperties> {
  static DataLakePrincipal = DataLakePrincipal;
  static PrincipalPermissions = PrincipalPermissions;
  constructor(properties?: DataLakeSettingsProperties) {
    super('AWS::LakeFormation::DataLakeSettings', properties || {});
  }
}
