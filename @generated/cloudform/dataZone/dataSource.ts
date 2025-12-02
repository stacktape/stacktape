import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class DataSourceConfigurationInput {
  RedshiftRunConfiguration?: RedshiftRunConfigurationInput;
  GlueRunConfiguration?: GlueRunConfigurationInput;
  SageMakerRunConfiguration?: SageMakerRunConfigurationInput;
  constructor(properties: DataSourceConfigurationInput) {
    Object.assign(this, properties);
  }
}

export class FilterExpression {
  Type!: Value<string>;
  Expression!: Value<string>;
  constructor(properties: FilterExpression) {
    Object.assign(this, properties);
  }
}

export class FormInput {
  TypeIdentifier?: Value<string>;
  TypeRevision?: Value<string>;
  Content?: Value<string>;
  FormName!: Value<string>;
  constructor(properties: FormInput) {
    Object.assign(this, properties);
  }
}

export class GlueRunConfigurationInput {
  DataAccessRole?: Value<string>;
  AutoImportDataQualityResult?: Value<boolean>;
  RelationalFilterConfigurations!: List<RelationalFilterConfiguration>;
  CatalogName?: Value<string>;
  constructor(properties: GlueRunConfigurationInput) {
    Object.assign(this, properties);
  }
}

export class RecommendationConfiguration {
  EnableBusinessNameGeneration?: Value<boolean>;
  constructor(properties: RecommendationConfiguration) {
    Object.assign(this, properties);
  }
}

export class RedshiftClusterStorage {
  ClusterName!: Value<string>;
  constructor(properties: RedshiftClusterStorage) {
    Object.assign(this, properties);
  }
}

export class RedshiftCredentialConfiguration {
  SecretManagerArn!: Value<string>;
  constructor(properties: RedshiftCredentialConfiguration) {
    Object.assign(this, properties);
  }
}

export class RedshiftRunConfigurationInput {
  DataAccessRole?: Value<string>;
  RelationalFilterConfigurations!: List<RelationalFilterConfiguration>;
  RedshiftCredentialConfiguration?: RedshiftCredentialConfiguration;
  RedshiftStorage?: RedshiftStorage;
  constructor(properties: RedshiftRunConfigurationInput) {
    Object.assign(this, properties);
  }
}

export class RedshiftServerlessStorage {
  WorkgroupName!: Value<string>;
  constructor(properties: RedshiftServerlessStorage) {
    Object.assign(this, properties);
  }
}

export class RedshiftStorage {
  RedshiftClusterSource?: RedshiftClusterStorage;
  RedshiftServerlessSource?: RedshiftServerlessStorage;
  constructor(properties: RedshiftStorage) {
    Object.assign(this, properties);
  }
}

export class RelationalFilterConfiguration {
  FilterExpressions?: List<FilterExpression>;
  DatabaseName!: Value<string>;
  SchemaName?: Value<string>;
  constructor(properties: RelationalFilterConfiguration) {
    Object.assign(this, properties);
  }
}

export class SageMakerRunConfigurationInput {
  TrackingAssets!: { [key: string]: any };
  constructor(properties: SageMakerRunConfigurationInput) {
    Object.assign(this, properties);
  }
}

export class ScheduleConfiguration {
  Timezone?: Value<string>;
  Schedule?: Value<string>;
  constructor(properties: ScheduleConfiguration) {
    Object.assign(this, properties);
  }
}
export interface DataSourceProperties {
  ProjectIdentifier: Value<string>;
  PublishOnImport?: Value<boolean>;
  Description?: Value<string>;
  EnvironmentIdentifier?: Value<string>;
  Configuration?: DataSourceConfigurationInput;
  AssetFormsInput?: List<FormInput>;
  Recommendation?: RecommendationConfiguration;
  Name: Value<string>;
  Type: Value<string>;
  EnableSetting?: Value<string>;
  ConnectionIdentifier?: Value<string>;
  Schedule?: ScheduleConfiguration;
  DomainIdentifier: Value<string>;
}
export default class DataSource extends ResourceBase<DataSourceProperties> {
  static DataSourceConfigurationInput = DataSourceConfigurationInput;
  static FilterExpression = FilterExpression;
  static FormInput = FormInput;
  static GlueRunConfigurationInput = GlueRunConfigurationInput;
  static RecommendationConfiguration = RecommendationConfiguration;
  static RedshiftClusterStorage = RedshiftClusterStorage;
  static RedshiftCredentialConfiguration = RedshiftCredentialConfiguration;
  static RedshiftRunConfigurationInput = RedshiftRunConfigurationInput;
  static RedshiftServerlessStorage = RedshiftServerlessStorage;
  static RedshiftStorage = RedshiftStorage;
  static RelationalFilterConfiguration = RelationalFilterConfiguration;
  static SageMakerRunConfigurationInput = SageMakerRunConfigurationInput;
  static ScheduleConfiguration = ScheduleConfiguration;
  constructor(properties: DataSourceProperties) {
    super('AWS::DataZone::DataSource', properties);
  }
}
