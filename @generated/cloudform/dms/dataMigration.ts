import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class DataMigrationSettings {
  SelectionRules?: Value<string>;
  CloudwatchLogsEnabled?: Value<boolean>;
  NumberOfJobs?: Value<number>;
  constructor(properties: DataMigrationSettings) {
    Object.assign(this, properties);
  }
}

export class SourceDataSettings {
  CDCStartTime?: Value<string>;
  CDCStopTime?: Value<string>;
  SlotName?: Value<string>;
  CDCStartPosition?: Value<string>;
  constructor(properties: SourceDataSettings) {
    Object.assign(this, properties);
  }
}
export interface DataMigrationProperties {
  DataMigrationType: Value<string>;
  DataMigrationSettings?: DataMigrationSettings;
  DataMigrationName?: Value<string>;
  MigrationProjectIdentifier: Value<string>;
  SourceDataSettings?: List<SourceDataSettings>;
  ServiceAccessRoleArn: Value<string>;
  Tags?: List<ResourceTag>;
  DataMigrationIdentifier?: Value<string>;
}
export default class DataMigration extends ResourceBase<DataMigrationProperties> {
  static DataMigrationSettings = DataMigrationSettings;
  static SourceDataSettings = SourceDataSettings;
  constructor(properties: DataMigrationProperties) {
    super('AWS::DMS::DataMigration', properties);
  }
}
