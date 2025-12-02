import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AggregateColumn {
  Function!: Value<string>;
  ColumnNames!: List<Value<string>>;
  constructor(properties: AggregateColumn) {
    Object.assign(this, properties);
  }
}

export class AggregationConstraint {
  ColumnName!: Value<string>;
  Minimum!: Value<number>;
  Type!: Value<string>;
  constructor(properties: AggregationConstraint) {
    Object.assign(this, properties);
  }
}

export class AnalysisRule {
  Policy!: ConfiguredTableAnalysisRulePolicy;
  Type!: Value<string>;
  constructor(properties: AnalysisRule) {
    Object.assign(this, properties);
  }
}

export class AnalysisRuleAggregation {
  AllowedJoinOperators?: List<Value<string>>;
  ScalarFunctions!: List<Value<string>>;
  AdditionalAnalyses?: Value<string>;
  OutputConstraints!: List<AggregationConstraint>;
  DimensionColumns!: List<Value<string>>;
  JoinColumns!: List<Value<string>>;
  JoinRequired?: Value<string>;
  AggregateColumns!: List<AggregateColumn>;
  constructor(properties: AnalysisRuleAggregation) {
    Object.assign(this, properties);
  }
}

export class AnalysisRuleCustom {
  AdditionalAnalyses?: Value<string>;
  AllowedAnalysisProviders?: List<Value<string>>;
  DifferentialPrivacy?: DifferentialPrivacy;
  AllowedAnalyses!: List<Value<string>>;
  DisallowedOutputColumns?: List<Value<string>>;
  constructor(properties: AnalysisRuleCustom) {
    Object.assign(this, properties);
  }
}

export class AnalysisRuleList {
  AllowedJoinOperators?: List<Value<string>>;
  ListColumns!: List<Value<string>>;
  AdditionalAnalyses?: Value<string>;
  JoinColumns!: List<Value<string>>;
  constructor(properties: AnalysisRuleList) {
    Object.assign(this, properties);
  }
}

export class AthenaTableReference {
  WorkGroup!: Value<string>;
  TableName!: Value<string>;
  DatabaseName!: Value<string>;
  OutputLocation?: Value<string>;
  constructor(properties: AthenaTableReference) {
    Object.assign(this, properties);
  }
}

export class ConfiguredTableAnalysisRulePolicy {
  V1!: ConfiguredTableAnalysisRulePolicyV1;
  constructor(properties: ConfiguredTableAnalysisRulePolicy) {
    Object.assign(this, properties);
  }
}

export class ConfiguredTableAnalysisRulePolicyV1 {
  Aggregation?: AnalysisRuleAggregation;
  List?: AnalysisRuleList;
  Custom?: AnalysisRuleCustom;
  constructor(properties: ConfiguredTableAnalysisRulePolicyV1) {
    Object.assign(this, properties);
  }
}

export class DifferentialPrivacy {
  Columns!: List<DifferentialPrivacyColumn>;
  constructor(properties: DifferentialPrivacy) {
    Object.assign(this, properties);
  }
}

export class DifferentialPrivacyColumn {
  Name!: Value<string>;
  constructor(properties: DifferentialPrivacyColumn) {
    Object.assign(this, properties);
  }
}

export class GlueTableReference {
  TableName!: Value<string>;
  DatabaseName!: Value<string>;
  constructor(properties: GlueTableReference) {
    Object.assign(this, properties);
  }
}

export class SnowflakeTableReference {
  SecretArn!: Value<string>;
  TableName!: Value<string>;
  TableSchema!: SnowflakeTableSchema;
  AccountIdentifier!: Value<string>;
  DatabaseName!: Value<string>;
  SchemaName!: Value<string>;
  constructor(properties: SnowflakeTableReference) {
    Object.assign(this, properties);
  }
}

export class SnowflakeTableSchema {
  V1!: List<SnowflakeTableSchemaV1>;
  constructor(properties: SnowflakeTableSchema) {
    Object.assign(this, properties);
  }
}

export class SnowflakeTableSchemaV1 {
  ColumnName!: Value<string>;
  ColumnType!: Value<string>;
  constructor(properties: SnowflakeTableSchemaV1) {
    Object.assign(this, properties);
  }
}

export class TableReference {
  Glue?: GlueTableReference;
  Snowflake?: SnowflakeTableReference;
  Athena?: AthenaTableReference;
  constructor(properties: TableReference) {
    Object.assign(this, properties);
  }
}
export interface ConfiguredTableProperties {
  SelectedAnalysisMethods?: List<Value<string>>;
  AnalysisMethod: Value<string>;
  TableReference: TableReference;
  Description?: Value<string>;
  AnalysisRules?: List<AnalysisRule>;
  AllowedColumns: List<Value<string>>;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
}
export default class ConfiguredTable extends ResourceBase<ConfiguredTableProperties> {
  static AggregateColumn = AggregateColumn;
  static AggregationConstraint = AggregationConstraint;
  static AnalysisRule = AnalysisRule;
  static AnalysisRuleAggregation = AnalysisRuleAggregation;
  static AnalysisRuleCustom = AnalysisRuleCustom;
  static AnalysisRuleList = AnalysisRuleList;
  static AthenaTableReference = AthenaTableReference;
  static ConfiguredTableAnalysisRulePolicy = ConfiguredTableAnalysisRulePolicy;
  static ConfiguredTableAnalysisRulePolicyV1 = ConfiguredTableAnalysisRulePolicyV1;
  static DifferentialPrivacy = DifferentialPrivacy;
  static DifferentialPrivacyColumn = DifferentialPrivacyColumn;
  static GlueTableReference = GlueTableReference;
  static SnowflakeTableReference = SnowflakeTableReference;
  static SnowflakeTableSchema = SnowflakeTableSchema;
  static SnowflakeTableSchemaV1 = SnowflakeTableSchemaV1;
  static TableReference = TableReference;
  constructor(properties: ConfiguredTableProperties) {
    super('AWS::CleanRooms::ConfiguredTable', properties);
  }
}
