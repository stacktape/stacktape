import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class RelationalDatabaseParameter {
  ApplyMethod?: Value<string>;
  IsModifiable?: Value<boolean>;
  ApplyType?: Value<string>;
  AllowedValues?: Value<string>;
  Description?: Value<string>;
  ParameterValue?: Value<string>;
  DataType?: Value<string>;
  ParameterName?: Value<string>;
  constructor(properties: RelationalDatabaseParameter) {
    Object.assign(this, properties);
  }
}
export interface DatabaseProperties {
  RelationalDatabaseName: Value<string>;
  CaCertificateIdentifier?: Value<string>;
  AvailabilityZone?: Value<string>;
  PreferredMaintenanceWindow?: Value<string>;
  RelationalDatabaseBlueprintId: Value<string>;
  PreferredBackupWindow?: Value<string>;
  MasterDatabaseName: Value<string>;
  MasterUserPassword?: Value<string>;
  RelationalDatabaseParameters?: List<RelationalDatabaseParameter>;
  RotateMasterUserPassword?: Value<boolean>;
  MasterUsername: Value<string>;
  PubliclyAccessible?: Value<boolean>;
  RelationalDatabaseBundleId: Value<string>;
  BackupRetention?: Value<boolean>;
  Tags?: List<ResourceTag>;
}
export default class Database extends ResourceBase<DatabaseProperties> {
  static RelationalDatabaseParameter = RelationalDatabaseParameter;
  constructor(properties: DatabaseProperties) {
    super('AWS::Lightsail::Database', properties);
  }
}
