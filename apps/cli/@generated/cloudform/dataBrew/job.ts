import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AllowedStatistics {
  Statistics!: List<Value<string>>;
  constructor(properties: AllowedStatistics) {
    Object.assign(this, properties);
  }
}

export class ColumnSelector {
  Regex?: Value<string>;
  Name?: Value<string>;
  constructor(properties: ColumnSelector) {
    Object.assign(this, properties);
  }
}

export class ColumnStatisticsConfiguration {
  Statistics!: StatisticsConfiguration;
  Selectors?: List<ColumnSelector>;
  constructor(properties: ColumnStatisticsConfiguration) {
    Object.assign(this, properties);
  }
}

export class CsvOutputOptions {
  Delimiter?: Value<string>;
  constructor(properties: CsvOutputOptions) {
    Object.assign(this, properties);
  }
}

export class DataCatalogOutput {
  TableName!: Value<string>;
  Overwrite?: Value<boolean>;
  S3Options?: S3TableOutputOptions;
  DatabaseOptions?: DatabaseTableOutputOptions;
  DatabaseName!: Value<string>;
  CatalogId?: Value<string>;
  constructor(properties: DataCatalogOutput) {
    Object.assign(this, properties);
  }
}

export class DatabaseOutput {
  DatabaseOutputMode?: Value<string>;
  DatabaseOptions!: DatabaseTableOutputOptions;
  GlueConnectionName!: Value<string>;
  constructor(properties: DatabaseOutput) {
    Object.assign(this, properties);
  }
}

export class DatabaseTableOutputOptions {
  TempDirectory?: S3Location;
  TableName!: Value<string>;
  constructor(properties: DatabaseTableOutputOptions) {
    Object.assign(this, properties);
  }
}

export class EntityDetectorConfiguration {
  EntityTypes!: List<Value<string>>;
  AllowedStatistics?: AllowedStatistics;
  constructor(properties: EntityDetectorConfiguration) {
    Object.assign(this, properties);
  }
}

export class JobSample {
  Size?: Value<number>;
  Mode?: Value<string>;
  constructor(properties: JobSample) {
    Object.assign(this, properties);
  }
}

export class Output {
  Overwrite?: Value<boolean>;
  Format?: Value<string>;
  MaxOutputFiles?: Value<number>;
  CompressionFormat?: Value<string>;
  PartitionColumns?: List<Value<string>>;
  FormatOptions?: OutputFormatOptions;
  Location!: S3Location;
  constructor(properties: Output) {
    Object.assign(this, properties);
  }
}

export class OutputFormatOptions {
  Csv?: CsvOutputOptions;
  constructor(properties: OutputFormatOptions) {
    Object.assign(this, properties);
  }
}

export class OutputLocation {
  Bucket!: Value<string>;
  BucketOwner?: Value<string>;
  Key?: Value<string>;
  constructor(properties: OutputLocation) {
    Object.assign(this, properties);
  }
}

export class ProfileConfiguration {
  ProfileColumns?: List<ColumnSelector>;
  DatasetStatisticsConfiguration?: StatisticsConfiguration;
  ColumnStatisticsConfigurations?: List<ColumnStatisticsConfiguration>;
  EntityDetectorConfiguration?: EntityDetectorConfiguration;
  constructor(properties: ProfileConfiguration) {
    Object.assign(this, properties);
  }
}

export class Recipe {
  Version?: Value<string>;
  Name!: Value<string>;
  constructor(properties: Recipe) {
    Object.assign(this, properties);
  }
}

export class S3Location {
  Bucket!: Value<string>;
  BucketOwner?: Value<string>;
  Key?: Value<string>;
  constructor(properties: S3Location) {
    Object.assign(this, properties);
  }
}

export class S3TableOutputOptions {
  Location!: S3Location;
  constructor(properties: S3TableOutputOptions) {
    Object.assign(this, properties);
  }
}

export class StatisticOverride {
  Parameters!: { [key: string]: Value<string> };
  Statistic!: Value<string>;
  constructor(properties: StatisticOverride) {
    Object.assign(this, properties);
  }
}

export class StatisticsConfiguration {
  IncludedStatistics?: List<Value<string>>;
  Overrides?: List<StatisticOverride>;
  constructor(properties: StatisticsConfiguration) {
    Object.assign(this, properties);
  }
}

export class ValidationConfiguration {
  RulesetArn!: Value<string>;
  ValidationMode?: Value<string>;
  constructor(properties: ValidationConfiguration) {
    Object.assign(this, properties);
  }
}
export interface JobProperties {
  MaxRetries?: Value<number>;
  ProjectName?: Value<string>;
  Recipe?: Recipe;
  EncryptionKeyArn?: Value<string>;
  LogSubscription?: Value<string>;
  Timeout?: Value<number>;
  DatabaseOutputs?: List<DatabaseOutput>;
  OutputLocation?: OutputLocation;
  RoleArn: Value<string>;
  Name: Value<string>;
  Type: Value<string>;
  DatasetName?: Value<string>;
  ProfileConfiguration?: ProfileConfiguration;
  Outputs?: List<Output>;
  ValidationConfigurations?: List<ValidationConfiguration>;
  Tags?: List<ResourceTag>;
  JobSample?: JobSample;
  EncryptionMode?: Value<string>;
  MaxCapacity?: Value<number>;
  DataCatalogOutputs?: List<DataCatalogOutput>;
}
export default class Job extends ResourceBase<JobProperties> {
  static AllowedStatistics = AllowedStatistics;
  static ColumnSelector = ColumnSelector;
  static ColumnStatisticsConfiguration = ColumnStatisticsConfiguration;
  static CsvOutputOptions = CsvOutputOptions;
  static DataCatalogOutput = DataCatalogOutput;
  static DatabaseOutput = DatabaseOutput;
  static DatabaseTableOutputOptions = DatabaseTableOutputOptions;
  static EntityDetectorConfiguration = EntityDetectorConfiguration;
  static JobSample = JobSample;
  static Output = Output;
  static OutputFormatOptions = OutputFormatOptions;
  static OutputLocation = OutputLocation;
  static ProfileConfiguration = ProfileConfiguration;
  static Recipe = Recipe;
  static S3Location = S3Location;
  static S3TableOutputOptions = S3TableOutputOptions;
  static StatisticOverride = StatisticOverride;
  static StatisticsConfiguration = StatisticsConfiguration;
  static ValidationConfiguration = ValidationConfiguration;
  constructor(properties: JobProperties) {
    super('AWS::DataBrew::Job', properties);
  }
}
