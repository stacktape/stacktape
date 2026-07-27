import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AdditionalNotes {
  Text?: Value<string>;
  constructor(properties: AdditionalNotes) {
    Object.assign(this, properties);
  }
}

export class AggregateOperation {
  GroupByColumnNames?: List<Value<string>>;
  Alias!: Value<string>;
  Aggregations!: List<Aggregation>;
  Source!: TransformOperationSource;
  constructor(properties: AggregateOperation) {
    Object.assign(this, properties);
  }
}

export class Aggregation {
  AggregationFunction!: DataPrepAggregationFunction;
  NewColumnName!: Value<string>;
  NewColumnId!: Value<string>;
  constructor(properties: Aggregation) {
    Object.assign(this, properties);
  }
}

export class AppendOperation {
  AppendedColumns!: List<AppendedColumn>;
  SecondSource?: TransformOperationSource;
  Alias!: Value<string>;
  FirstSource?: TransformOperationSource;
  constructor(properties: AppendOperation) {
    Object.assign(this, properties);
  }
}

export class AppendedColumn {
  ColumnName!: Value<string>;
  NewColumnId!: Value<string>;
  constructor(properties: AppendedColumn) {
    Object.assign(this, properties);
  }
}

export class CalculatedColumn {
  ColumnId!: Value<string>;
  ColumnName!: Value<string>;
  Expression!: Value<string>;
  constructor(properties: CalculatedColumn) {
    Object.assign(this, properties);
  }
}

export class CastColumnTypeOperation {
  ColumnName!: Value<string>;
  SubType?: Value<string>;
  Format?: Value<string>;
  NewColumnType!: Value<string>;
  constructor(properties: CastColumnTypeOperation) {
    Object.assign(this, properties);
  }
}

export class CastColumnTypesOperation {
  CastColumnTypeOperations!: List<CastColumnTypeOperation>;
  Alias!: Value<string>;
  Source!: TransformOperationSource;
  constructor(properties: CastColumnTypesOperation) {
    Object.assign(this, properties);
  }
}

export class ColumnDescription {
  Text?: Value<string>;
  constructor(properties: ColumnDescription) {
    Object.assign(this, properties);
  }
}

export class ColumnGroup {
  GeoSpatialColumnGroup?: GeoSpatialColumnGroup;
  constructor(properties: ColumnGroup) {
    Object.assign(this, properties);
  }
}

export class ColumnLevelPermissionRule {
  ColumnNames?: List<Value<string>>;
  Principals?: List<Value<string>>;
  constructor(properties: ColumnLevelPermissionRule) {
    Object.assign(this, properties);
  }
}

export class ColumnSemanticProperty {
  SemanticType?: ColumnSemanticType;
  Description?: ColumnDescription;
  AdditionalNotes?: AdditionalNotes;
  constructor(properties: ColumnSemanticProperty) {
    Object.assign(this, properties);
  }
}

export class ColumnSemanticType {
  GeographicalRole?: Value<string>;
  constructor(properties: ColumnSemanticType) {
    Object.assign(this, properties);
  }
}

export class ColumnToUnpivot {
  ColumnName?: Value<string>;
  NewValue?: Value<string>;
  constructor(properties: ColumnToUnpivot) {
    Object.assign(this, properties);
  }
}

export class CreateColumnsOperation {
  Alias?: Value<string>;
  Columns!: List<CalculatedColumn>;
  Source?: TransformOperationSource;
  constructor(properties: CreateColumnsOperation) {
    Object.assign(this, properties);
  }
}

export class CustomInstruction {
  InlineCustomInstruction?: InlineCustomInstruction;
  constructor(properties: CustomInstruction) {
    Object.assign(this, properties);
  }
}

export class CustomSql {
  DataSourceArn!: Value<string>;
  SqlQuery!: Value<string>;
  Columns!: List<InputColumn>;
  Name!: Value<string>;
  constructor(properties: CustomSql) {
    Object.assign(this, properties);
  }
}

export class DataPrepAggregationFunction {
  PercentileAggregation?: DataPrepPercentileAggregationFunction;
  ListAggregation?: DataPrepListAggregationFunction;
  SimpleAggregation?: DataPrepSimpleAggregationFunction;
  constructor(properties: DataPrepAggregationFunction) {
    Object.assign(this, properties);
  }
}

export class DataPrepConfiguration {
  DestinationTableMap!: { [key: string]: DestinationTable };
  TransformStepMap!: { [key: string]: TransformStep };
  SourceTableMap!: { [key: string]: SourceTable };
  constructor(properties: DataPrepConfiguration) {
    Object.assign(this, properties);
  }
}

export class DataPrepListAggregationFunction {
  Distinct!: Value<boolean>;
  InputColumnName?: Value<string>;
  Separator!: Value<string>;
  constructor(properties: DataPrepListAggregationFunction) {
    Object.assign(this, properties);
  }
}

export class DataPrepPercentileAggregationFunction {
  InputColumnName?: Value<string>;
  PercentileValue!: Value<number>;
  constructor(properties: DataPrepPercentileAggregationFunction) {
    Object.assign(this, properties);
  }
}

export class DataPrepSimpleAggregationFunction {
  FunctionType!: Value<string>;
  InputColumnName?: Value<string>;
  constructor(properties: DataPrepSimpleAggregationFunction) {
    Object.assign(this, properties);
  }
}

export class DataSetColumnIdMapping {
  SourceColumnId!: Value<string>;
  TargetColumnId!: Value<string>;
  constructor(properties: DataSetColumnIdMapping) {
    Object.assign(this, properties);
  }
}

export class DataSetDateComparisonFilterCondition {
  Operator!: Value<string>;
  Value?: DataSetDateFilterValue;
  constructor(properties: DataSetDateComparisonFilterCondition) {
    Object.assign(this, properties);
  }
}

export class DataSetDateFilterCondition {
  ColumnName?: Value<string>;
  RangeFilterCondition?: DataSetDateRangeFilterCondition;
  ComparisonFilterCondition?: DataSetDateComparisonFilterCondition;
  constructor(properties: DataSetDateFilterCondition) {
    Object.assign(this, properties);
  }
}

export class DataSetDateFilterValue {
  StaticValue?: Value<string>;
  constructor(properties: DataSetDateFilterValue) {
    Object.assign(this, properties);
  }
}

export class DataSetDateRangeFilterCondition {
  IncludeMaximum?: Value<boolean>;
  RangeMinimum?: DataSetDateFilterValue;
  RangeMaximum?: DataSetDateFilterValue;
  IncludeMinimum?: Value<boolean>;
  constructor(properties: DataSetDateRangeFilterCondition) {
    Object.assign(this, properties);
  }
}

export class DataSetNumericComparisonFilterCondition {
  Operator!: Value<string>;
  Value?: DataSetNumericFilterValue;
  constructor(properties: DataSetNumericComparisonFilterCondition) {
    Object.assign(this, properties);
  }
}

export class DataSetNumericFilterCondition {
  ColumnName?: Value<string>;
  RangeFilterCondition?: DataSetNumericRangeFilterCondition;
  ComparisonFilterCondition?: DataSetNumericComparisonFilterCondition;
  constructor(properties: DataSetNumericFilterCondition) {
    Object.assign(this, properties);
  }
}

export class DataSetNumericFilterValue {
  StaticValue?: Value<number>;
  constructor(properties: DataSetNumericFilterValue) {
    Object.assign(this, properties);
  }
}

export class DataSetNumericRangeFilterCondition {
  IncludeMaximum?: Value<boolean>;
  RangeMinimum?: DataSetNumericFilterValue;
  RangeMaximum?: DataSetNumericFilterValue;
  IncludeMinimum?: Value<boolean>;
  constructor(properties: DataSetNumericRangeFilterCondition) {
    Object.assign(this, properties);
  }
}

export class DataSetRefreshProperties {
  RefreshConfiguration?: RefreshConfiguration;
  FailureConfiguration?: RefreshFailureConfiguration;
  constructor(properties: DataSetRefreshProperties) {
    Object.assign(this, properties);
  }
}

export class DataSetSemanticDescription {
  Text!: Value<string>;
  constructor(properties: DataSetSemanticDescription) {
    Object.assign(this, properties);
  }
}

export class DataSetSemanticMetadata {
  CustomInstructions?: List<CustomInstruction>;
  Description?: DataSetSemanticDescription;
  constructor(properties: DataSetSemanticMetadata) {
    Object.assign(this, properties);
  }
}

export class DataSetStringComparisonFilterCondition {
  Operator!: Value<string>;
  Value?: DataSetStringFilterValue;
  constructor(properties: DataSetStringComparisonFilterCondition) {
    Object.assign(this, properties);
  }
}

export class DataSetStringFilterCondition {
  ColumnName?: Value<string>;
  ComparisonFilterCondition?: DataSetStringComparisonFilterCondition;
  ListFilterCondition?: DataSetStringListFilterCondition;
  constructor(properties: DataSetStringFilterCondition) {
    Object.assign(this, properties);
  }
}

export class DataSetStringFilterValue {
  StaticValue?: Value<string>;
  constructor(properties: DataSetStringFilterValue) {
    Object.assign(this, properties);
  }
}

export class DataSetStringListFilterCondition {
  Operator!: Value<string>;
  Values?: DataSetStringListFilterValue;
  constructor(properties: DataSetStringListFilterCondition) {
    Object.assign(this, properties);
  }
}

export class DataSetStringListFilterValue {
  StaticValues?: List<Value<string>>;
  constructor(properties: DataSetStringListFilterValue) {
    Object.assign(this, properties);
  }
}

export class DataSetUsageConfiguration {
  DisableUseAsImportedSource?: Value<boolean>;
  DisableUseAsDirectQuerySource?: Value<boolean>;
  constructor(properties: DataSetUsageConfiguration) {
    Object.assign(this, properties);
  }
}

export class DatasetParameter {
  IntegerDatasetParameter?: IntegerDatasetParameter;
  DateTimeDatasetParameter?: DateTimeDatasetParameter;
  DecimalDatasetParameter?: DecimalDatasetParameter;
  StringDatasetParameter?: StringDatasetParameter;
  constructor(properties: DatasetParameter) {
    Object.assign(this, properties);
  }
}

export class DateTimeDatasetParameter {
  ValueType!: Value<string>;
  TimeGranularity?: Value<string>;
  DefaultValues?: DateTimeDatasetParameterDefaultValues;
  Id!: Value<string>;
  Name!: Value<string>;
  constructor(properties: DateTimeDatasetParameter) {
    Object.assign(this, properties);
  }
}

export class DateTimeDatasetParameterDefaultValues {
  StaticValues?: List<Value<string>>;
  constructor(properties: DateTimeDatasetParameterDefaultValues) {
    Object.assign(this, properties);
  }
}

export class DecimalDatasetParameter {
  ValueType!: Value<string>;
  DefaultValues?: DecimalDatasetParameterDefaultValues;
  Id!: Value<string>;
  Name!: Value<string>;
  constructor(properties: DecimalDatasetParameter) {
    Object.assign(this, properties);
  }
}

export class DecimalDatasetParameterDefaultValues {
  StaticValues?: List<Value<number>>;
  constructor(properties: DecimalDatasetParameterDefaultValues) {
    Object.assign(this, properties);
  }
}

export class DestinationTable {
  Alias!: Value<string>;
  Source!: DestinationTableSource;
  constructor(properties: DestinationTable) {
    Object.assign(this, properties);
  }
}

export class DestinationTableSource {
  TransformOperationId!: Value<string>;
  constructor(properties: DestinationTableSource) {
    Object.assign(this, properties);
  }
}

export class FieldFolder {
  Description?: Value<string>;
  Columns?: List<Value<string>>;
  constructor(properties: FieldFolder) {
    Object.assign(this, properties);
  }
}

export class FilterOperation {
  DateFilterCondition?: DataSetDateFilterCondition;
  StringFilterCondition?: DataSetStringFilterCondition;
  ConditionExpression?: Value<string>;
  NumericFilterCondition?: DataSetNumericFilterCondition;
  constructor(properties: FilterOperation) {
    Object.assign(this, properties);
  }
}

export class FiltersOperation {
  FilterOperations!: List<FilterOperation>;
  Alias!: Value<string>;
  Source!: TransformOperationSource;
  constructor(properties: FiltersOperation) {
    Object.assign(this, properties);
  }
}

export class GeoSpatialColumnGroup {
  Columns!: List<Value<string>>;
  CountryCode?: Value<string>;
  Name!: Value<string>;
  constructor(properties: GeoSpatialColumnGroup) {
    Object.assign(this, properties);
  }
}

export class ImportTableOperation {
  Alias!: Value<string>;
  Source!: ImportTableOperationSource;
  constructor(properties: ImportTableOperation) {
    Object.assign(this, properties);
  }
}

export class ImportTableOperationSource {
  SourceTableId!: Value<string>;
  ColumnIdMappings?: List<DataSetColumnIdMapping>;
  constructor(properties: ImportTableOperationSource) {
    Object.assign(this, properties);
  }
}

export class IncrementalRefresh {
  LookbackWindow!: LookbackWindow;
  constructor(properties: IncrementalRefresh) {
    Object.assign(this, properties);
  }
}

export class IngestionWaitPolicy {
  WaitForSpiceIngestion?: Value<boolean>;
  IngestionWaitTimeInHours?: Value<number>;
  constructor(properties: IngestionWaitPolicy) {
    Object.assign(this, properties);
  }
}

export class InlineCustomInstruction {
  InstructionText!: Value<string>;
  UploadedDocumentMetadata?: UploadedDocumentMetadata;
  constructor(properties: InlineCustomInstruction) {
    Object.assign(this, properties);
  }
}

export class InputColumn {
  Type!: Value<string>;
  SubType?: Value<string>;
  Id?: Value<string>;
  Name!: Value<string>;
  constructor(properties: InputColumn) {
    Object.assign(this, properties);
  }
}

export class IntegerDatasetParameter {
  ValueType!: Value<string>;
  DefaultValues?: IntegerDatasetParameterDefaultValues;
  Id!: Value<string>;
  Name!: Value<string>;
  constructor(properties: IntegerDatasetParameter) {
    Object.assign(this, properties);
  }
}

export class IntegerDatasetParameterDefaultValues {
  StaticValues?: List<Value<number>>;
  constructor(properties: IntegerDatasetParameterDefaultValues) {
    Object.assign(this, properties);
  }
}

export class JoinOperandProperties {
  OutputColumnNameOverrides!: List<OutputColumnNameOverride>;
  constructor(properties: JoinOperandProperties) {
    Object.assign(this, properties);
  }
}

export class JoinOperation {
  OnClause!: Value<string>;
  Type!: Value<string>;
  RightOperandProperties?: JoinOperandProperties;
  LeftOperandProperties?: JoinOperandProperties;
  Alias!: Value<string>;
  LeftOperand!: TransformOperationSource;
  RightOperand!: TransformOperationSource;
  constructor(properties: JoinOperation) {
    Object.assign(this, properties);
  }
}

export class LookbackWindow {
  ColumnName!: Value<string>;
  SizeUnit!: Value<string>;
  Size!: Value<number>;
  constructor(properties: LookbackWindow) {
    Object.assign(this, properties);
  }
}

export class OutputColumn {
  Type?: Value<string>;
  Description?: Value<string>;
  SubType?: Value<string>;
  Id?: Value<string>;
  Name?: Value<string>;
  constructor(properties: OutputColumn) {
    Object.assign(this, properties);
  }
}

export class OutputColumnNameOverride {
  OutputColumnName!: Value<string>;
  SourceColumnName?: Value<string>;
  constructor(properties: OutputColumnNameOverride) {
    Object.assign(this, properties);
  }
}

export class ParentDataSet {
  InputColumns!: List<InputColumn>;
  DataSetArn!: Value<string>;
  constructor(properties: ParentDataSet) {
    Object.assign(this, properties);
  }
}

export class PerformanceConfiguration {
  UniqueKeys?: List<UniqueKey>;
  constructor(properties: PerformanceConfiguration) {
    Object.assign(this, properties);
  }
}

export class PhysicalTable {
  SaaSTable?: SaaSTable;
  RelationalTable?: RelationalTable;
  CustomSql?: CustomSql;
  S3Source?: S3Source;
  constructor(properties: PhysicalTable) {
    Object.assign(this, properties);
  }
}

export class PivotConfiguration {
  LabelColumnName?: Value<string>;
  PivotedLabels!: List<PivotedLabel>;
  constructor(properties: PivotConfiguration) {
    Object.assign(this, properties);
  }
}

export class PivotOperation {
  PivotConfiguration!: PivotConfiguration;
  GroupByColumnNames?: List<Value<string>>;
  Alias!: Value<string>;
  ValueColumnConfiguration!: ValueColumnConfiguration;
  Source!: TransformOperationSource;
  constructor(properties: PivotOperation) {
    Object.assign(this, properties);
  }
}

export class PivotedLabel {
  NewColumnName!: Value<string>;
  NewColumnId!: Value<string>;
  LabelName!: Value<string>;
  constructor(properties: PivotedLabel) {
    Object.assign(this, properties);
  }
}

export class ProjectOperation {
  Alias?: Value<string>;
  ProjectedColumns?: List<Value<string>>;
  Source?: TransformOperationSource;
  constructor(properties: ProjectOperation) {
    Object.assign(this, properties);
  }
}

export class RefreshConfiguration {
  IncrementalRefresh!: IncrementalRefresh;
  constructor(properties: RefreshConfiguration) {
    Object.assign(this, properties);
  }
}

export class RefreshFailureConfiguration {
  EmailAlert?: RefreshFailureEmailAlert;
  constructor(properties: RefreshFailureConfiguration) {
    Object.assign(this, properties);
  }
}

export class RefreshFailureEmailAlert {
  AlertStatus?: Value<string>;
  constructor(properties: RefreshFailureEmailAlert) {
    Object.assign(this, properties);
  }
}

export class RelationalTable {
  DataSourceArn!: Value<string>;
  InputColumns!: List<InputColumn>;
  Schema?: Value<string>;
  Catalog?: Value<string>;
  Name!: Value<string>;
  constructor(properties: RelationalTable) {
    Object.assign(this, properties);
  }
}

export class RenameColumnOperation {
  NewColumnName!: Value<string>;
  ColumnName!: Value<string>;
  constructor(properties: RenameColumnOperation) {
    Object.assign(this, properties);
  }
}

export class RenameColumnsOperation {
  Alias!: Value<string>;
  RenameColumnOperations!: List<RenameColumnOperation>;
  Source!: TransformOperationSource;
  constructor(properties: RenameColumnsOperation) {
    Object.assign(this, properties);
  }
}

export class ResourcePermission {
  Actions!: List<Value<string>>;
  Principal!: Value<string>;
  constructor(properties: ResourcePermission) {
    Object.assign(this, properties);
  }
}

export class RowLevelPermissionConfiguration {
  TagConfiguration?: RowLevelPermissionTagConfiguration;
  RowLevelPermissionDataSet?: RowLevelPermissionDataSet;
  constructor(properties: RowLevelPermissionConfiguration) {
    Object.assign(this, properties);
  }
}

export class RowLevelPermissionDataSet {
  Status?: Value<string>;
  FormatVersion?: Value<string>;
  Arn!: Value<string>;
  Namespace?: Value<string>;
  PermissionPolicy!: Value<string>;
  constructor(properties: RowLevelPermissionDataSet) {
    Object.assign(this, properties);
  }
}

export class RowLevelPermissionTagConfiguration {
  Status?: Value<string>;
  TagRules!: List<RowLevelPermissionTagRule>;
  TagRuleConfigurations?: { [key: string]: any };
  constructor(properties: RowLevelPermissionTagConfiguration) {
    Object.assign(this, properties);
  }
}

export class RowLevelPermissionTagRule {
  ColumnName!: Value<string>;
  TagKey!: Value<string>;
  MatchAllValue?: Value<string>;
  TagMultiValueDelimiter?: Value<string>;
  constructor(properties: RowLevelPermissionTagRule) {
    Object.assign(this, properties);
  }
}

export class S3Source {
  DataSourceArn!: Value<string>;
  InputColumns!: List<InputColumn>;
  UploadSettings?: UploadSettings;
  constructor(properties: S3Source) {
    Object.assign(this, properties);
  }
}

export class SaaSTable {
  DataSourceArn!: Value<string>;
  InputColumns!: List<InputColumn>;
  TablePath!: List<TablePathElement>;
  constructor(properties: SaaSTable) {
    Object.assign(this, properties);
  }
}

export class SemanticModelConfiguration {
  SemanticMetadata?: List<DataSetSemanticMetadata>;
  TableMap?: { [key: string]: SemanticTable };
  constructor(properties: SemanticModelConfiguration) {
    Object.assign(this, properties);
  }
}

export class SemanticTable {
  SemanticMetadata?: TableSemanticMetadata;
  Alias!: Value<string>;
  DestinationTableId!: Value<string>;
  RowLevelPermissionConfiguration?: RowLevelPermissionConfiguration;
  constructor(properties: SemanticTable) {
    Object.assign(this, properties);
  }
}

export class SharedColumnSemanticMetadata {
  ColumnNames?: List<Value<string>>;
  ColumnProperties!: List<ColumnSemanticProperty>;
  constructor(properties: SharedColumnSemanticMetadata) {
    Object.assign(this, properties);
  }
}

export class SourceTable {
  PhysicalTableId?: Value<string>;
  DataSet?: ParentDataSet;
  constructor(properties: SourceTable) {
    Object.assign(this, properties);
  }
}

export class StringDatasetParameter {
  ValueType!: Value<string>;
  DefaultValues?: StringDatasetParameterDefaultValues;
  Id!: Value<string>;
  Name!: Value<string>;
  constructor(properties: StringDatasetParameter) {
    Object.assign(this, properties);
  }
}

export class StringDatasetParameterDefaultValues {
  StaticValues?: List<Value<string>>;
  constructor(properties: StringDatasetParameterDefaultValues) {
    Object.assign(this, properties);
  }
}

export class TablePathElement {
  Id?: Value<string>;
  Name?: Value<string>;
  constructor(properties: TablePathElement) {
    Object.assign(this, properties);
  }
}

export class TableSemanticMetadata {
  ColumnMetadata?: List<SharedColumnSemanticMetadata>;
  constructor(properties: TableSemanticMetadata) {
    Object.assign(this, properties);
  }
}

export class TransformOperationSource {
  TransformOperationId!: Value<string>;
  ColumnIdMappings?: List<DataSetColumnIdMapping>;
  constructor(properties: TransformOperationSource) {
    Object.assign(this, properties);
  }
}

export class TransformStep {
  ProjectStep?: ProjectOperation;
  CreateColumnsStep?: CreateColumnsOperation;
  RenameColumnsStep?: RenameColumnsOperation;
  CastColumnTypesStep?: CastColumnTypesOperation;
  ImportTableStep?: ImportTableOperation;
  UnpivotStep?: UnpivotOperation;
  JoinStep?: JoinOperation;
  AppendStep?: AppendOperation;
  FiltersStep?: FiltersOperation;
  AggregateStep?: AggregateOperation;
  PivotStep?: PivotOperation;
  constructor(properties: TransformStep) {
    Object.assign(this, properties);
  }
}

export class UniqueKey {
  ColumnNames!: List<Value<string>>;
  constructor(properties: UniqueKey) {
    Object.assign(this, properties);
  }
}

export class UnpivotOperation {
  UnpivotedLabelColumnName!: Value<string>;
  ColumnsToUnpivot!: List<ColumnToUnpivot>;
  UnpivotedLabelColumnId!: Value<string>;
  Alias!: Value<string>;
  UnpivotedValueColumnId!: Value<string>;
  UnpivotedValueColumnName!: Value<string>;
  Source!: TransformOperationSource;
  constructor(properties: UnpivotOperation) {
    Object.assign(this, properties);
  }
}

export class UploadSettings {
  ContainsHeader?: Value<boolean>;
  TextQualifier?: Value<string>;
  Format?: Value<string>;
  StartFromRow?: Value<number>;
  Delimiter?: Value<string>;
  constructor(properties: UploadSettings) {
    Object.assign(this, properties);
  }
}

export class UploadedDocumentMetadata {
  Name?: Value<string>;
  constructor(properties: UploadedDocumentMetadata) {
    Object.assign(this, properties);
  }
}

export class ValueColumnConfiguration {
  AggregationFunction?: DataPrepAggregationFunction;
  constructor(properties: ValueColumnConfiguration) {
    Object.assign(this, properties);
  }
}
export interface DataSetProperties {
  PhysicalTableMap?: { [key: string]: PhysicalTable };
  FieldFolders?: { [key: string]: FieldFolder };
  SemanticModelConfiguration?: SemanticModelConfiguration;
  FolderArns?: List<Value<string>>;
  DataSetId?: Value<string>;
  PerformanceConfiguration?: PerformanceConfiguration;
  IngestionWaitPolicy?: IngestionWaitPolicy;
  DataSetRefreshProperties?: DataSetRefreshProperties;
  ColumnLevelPermissionRules?: List<ColumnLevelPermissionRule>;
  Name?: Value<string>;
  ColumnGroups?: List<ColumnGroup>;
  ImportMode?: Value<string>;
  DatasetParameters?: List<DatasetParameter>;
  Permissions?: List<ResourcePermission>;
  AwsAccountId?: Value<string>;
  DataSetUsageConfiguration?: DataSetUsageConfiguration;
  UseAs?: Value<string>;
  DataPrepConfiguration?: DataPrepConfiguration;
  Tags?: List<ResourceTag>;
}
export default class DataSet extends ResourceBase<DataSetProperties> {
  static AdditionalNotes = AdditionalNotes;
  static AggregateOperation = AggregateOperation;
  static Aggregation = Aggregation;
  static AppendOperation = AppendOperation;
  static AppendedColumn = AppendedColumn;
  static CalculatedColumn = CalculatedColumn;
  static CastColumnTypeOperation = CastColumnTypeOperation;
  static CastColumnTypesOperation = CastColumnTypesOperation;
  static ColumnDescription = ColumnDescription;
  static ColumnGroup = ColumnGroup;
  static ColumnLevelPermissionRule = ColumnLevelPermissionRule;
  static ColumnSemanticProperty = ColumnSemanticProperty;
  static ColumnSemanticType = ColumnSemanticType;
  static ColumnToUnpivot = ColumnToUnpivot;
  static CreateColumnsOperation = CreateColumnsOperation;
  static CustomInstruction = CustomInstruction;
  static CustomSql = CustomSql;
  static DataPrepAggregationFunction = DataPrepAggregationFunction;
  static DataPrepConfiguration = DataPrepConfiguration;
  static DataPrepListAggregationFunction = DataPrepListAggregationFunction;
  static DataPrepPercentileAggregationFunction = DataPrepPercentileAggregationFunction;
  static DataPrepSimpleAggregationFunction = DataPrepSimpleAggregationFunction;
  static DataSetColumnIdMapping = DataSetColumnIdMapping;
  static DataSetDateComparisonFilterCondition = DataSetDateComparisonFilterCondition;
  static DataSetDateFilterCondition = DataSetDateFilterCondition;
  static DataSetDateFilterValue = DataSetDateFilterValue;
  static DataSetDateRangeFilterCondition = DataSetDateRangeFilterCondition;
  static DataSetNumericComparisonFilterCondition = DataSetNumericComparisonFilterCondition;
  static DataSetNumericFilterCondition = DataSetNumericFilterCondition;
  static DataSetNumericFilterValue = DataSetNumericFilterValue;
  static DataSetNumericRangeFilterCondition = DataSetNumericRangeFilterCondition;
  static DataSetRefreshProperties = DataSetRefreshProperties;
  static DataSetSemanticDescription = DataSetSemanticDescription;
  static DataSetSemanticMetadata = DataSetSemanticMetadata;
  static DataSetStringComparisonFilterCondition = DataSetStringComparisonFilterCondition;
  static DataSetStringFilterCondition = DataSetStringFilterCondition;
  static DataSetStringFilterValue = DataSetStringFilterValue;
  static DataSetStringListFilterCondition = DataSetStringListFilterCondition;
  static DataSetStringListFilterValue = DataSetStringListFilterValue;
  static DataSetUsageConfiguration = DataSetUsageConfiguration;
  static DatasetParameter = DatasetParameter;
  static DateTimeDatasetParameter = DateTimeDatasetParameter;
  static DateTimeDatasetParameterDefaultValues = DateTimeDatasetParameterDefaultValues;
  static DecimalDatasetParameter = DecimalDatasetParameter;
  static DecimalDatasetParameterDefaultValues = DecimalDatasetParameterDefaultValues;
  static DestinationTable = DestinationTable;
  static DestinationTableSource = DestinationTableSource;
  static FieldFolder = FieldFolder;
  static FilterOperation = FilterOperation;
  static FiltersOperation = FiltersOperation;
  static GeoSpatialColumnGroup = GeoSpatialColumnGroup;
  static ImportTableOperation = ImportTableOperation;
  static ImportTableOperationSource = ImportTableOperationSource;
  static IncrementalRefresh = IncrementalRefresh;
  static IngestionWaitPolicy = IngestionWaitPolicy;
  static InlineCustomInstruction = InlineCustomInstruction;
  static InputColumn = InputColumn;
  static IntegerDatasetParameter = IntegerDatasetParameter;
  static IntegerDatasetParameterDefaultValues = IntegerDatasetParameterDefaultValues;
  static JoinOperandProperties = JoinOperandProperties;
  static JoinOperation = JoinOperation;
  static LookbackWindow = LookbackWindow;
  static OutputColumn = OutputColumn;
  static OutputColumnNameOverride = OutputColumnNameOverride;
  static ParentDataSet = ParentDataSet;
  static PerformanceConfiguration = PerformanceConfiguration;
  static PhysicalTable = PhysicalTable;
  static PivotConfiguration = PivotConfiguration;
  static PivotOperation = PivotOperation;
  static PivotedLabel = PivotedLabel;
  static ProjectOperation = ProjectOperation;
  static RefreshConfiguration = RefreshConfiguration;
  static RefreshFailureConfiguration = RefreshFailureConfiguration;
  static RefreshFailureEmailAlert = RefreshFailureEmailAlert;
  static RelationalTable = RelationalTable;
  static RenameColumnOperation = RenameColumnOperation;
  static RenameColumnsOperation = RenameColumnsOperation;
  static ResourcePermission = ResourcePermission;
  static RowLevelPermissionConfiguration = RowLevelPermissionConfiguration;
  static RowLevelPermissionDataSet = RowLevelPermissionDataSet;
  static RowLevelPermissionTagConfiguration = RowLevelPermissionTagConfiguration;
  static RowLevelPermissionTagRule = RowLevelPermissionTagRule;
  static S3Source = S3Source;
  static SaaSTable = SaaSTable;
  static SemanticModelConfiguration = SemanticModelConfiguration;
  static SemanticTable = SemanticTable;
  static SharedColumnSemanticMetadata = SharedColumnSemanticMetadata;
  static SourceTable = SourceTable;
  static StringDatasetParameter = StringDatasetParameter;
  static StringDatasetParameterDefaultValues = StringDatasetParameterDefaultValues;
  static TablePathElement = TablePathElement;
  static TableSemanticMetadata = TableSemanticMetadata;
  static TransformOperationSource = TransformOperationSource;
  static TransformStep = TransformStep;
  static UniqueKey = UniqueKey;
  static UnpivotOperation = UnpivotOperation;
  static UploadSettings = UploadSettings;
  static UploadedDocumentMetadata = UploadedDocumentMetadata;
  static ValueColumnConfiguration = ValueColumnConfiguration;
  constructor(properties?: DataSetProperties) {
    super('AWS::QuickSight::DataSet', properties || {});
  }
}
