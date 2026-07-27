import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class IcebergConfiguration {
  OrphanFileRetentionPeriodInDays?: Value<number>;
  Location?: Value<string>;
  constructor(properties: IcebergConfiguration) {
    Object.assign(this, properties);
  }
}

export class IcebergRetentionConfiguration {
  CleanExpiredFiles?: Value<boolean>;
  SnapshotRetentionPeriodInDays?: Value<number>;
  NumberOfSnapshotsToRetain?: Value<number>;
  constructor(properties: IcebergRetentionConfiguration) {
    Object.assign(this, properties);
  }
}

export class OrphanFileDeletionConfiguration {
  IcebergConfiguration?: IcebergConfiguration;
  constructor(properties: OrphanFileDeletionConfiguration) {
    Object.assign(this, properties);
  }
}

export class RetentionConfiguration {
  IcebergConfiguration?: IcebergRetentionConfiguration;
  constructor(properties: RetentionConfiguration) {
    Object.assign(this, properties);
  }
}

export class TableOptimizerConfiguration {
  RetentionConfiguration?: RetentionConfiguration;
  OrphanFileDeletionConfiguration?: OrphanFileDeletionConfiguration;
  Enabled!: Value<boolean>;
  VpcConfiguration?: VpcConfiguration;
  RoleArn!: Value<string>;
  constructor(properties: TableOptimizerConfiguration) {
    Object.assign(this, properties);
  }
}

export class VpcConfiguration {
  GlueConnectionName?: Value<string>;
  constructor(properties: VpcConfiguration) {
    Object.assign(this, properties);
  }
}
export interface TableOptimizerProperties {
  TableName: Value<string>;
  Type: Value<string>;
  DatabaseName: Value<string>;
  TableOptimizerConfiguration: TableOptimizerConfiguration;
  CatalogId: Value<string>;
}
export default class TableOptimizer extends ResourceBase<TableOptimizerProperties> {
  static IcebergConfiguration = IcebergConfiguration;
  static IcebergRetentionConfiguration = IcebergRetentionConfiguration;
  static OrphanFileDeletionConfiguration = OrphanFileDeletionConfiguration;
  static RetentionConfiguration = RetentionConfiguration;
  static TableOptimizerConfiguration = TableOptimizerConfiguration;
  static VpcConfiguration = VpcConfiguration;
  constructor(properties: TableOptimizerProperties) {
    super('AWS::Glue::TableOptimizer', properties);
  }
}
