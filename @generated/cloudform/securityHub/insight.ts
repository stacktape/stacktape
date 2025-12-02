import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class AwsSecurityFindingFilters {
  ResourceAwsEc2InstanceIamInstanceProfileArn?: List<StringFilter>;
  SourceUrl?: List<StringFilter>;
  ProcessName?: List<StringFilter>;
  FindingProviderFieldsConfidence?: List<NumberFilter>;
  FirstObservedAt?: List<DateFilter>;
  CreatedAt?: List<DateFilter>;
  MalwareState?: List<StringFilter>;
  UserDefinedFields?: List<MapFilter>;
  NetworkSourcePort?: List<NumberFilter>;
  ResourceAwsIamUserUserName?: List<StringFilter>;
  NetworkSourceDomain?: List<StringFilter>;
  ResourcePartition?: List<StringFilter>;
  FindingProviderFieldsRelatedFindingsId?: List<StringFilter>;
  NetworkDirection?: List<StringFilter>;
  Criticality?: List<NumberFilter>;
  ResourceApplicationArn?: List<StringFilter>;
  ComplianceSecurityControlParametersValue?: List<StringFilter>;
  SeverityLabel?: List<StringFilter>;
  RelatedFindingsProductArn?: List<StringFilter>;
  ResourceAwsIamAccessKeyPrincipalName?: List<StringFilter>;
  ThreatIntelIndicatorCategory?: List<StringFilter>;
  ComplianceStatus?: List<StringFilter>;
  ThreatIntelIndicatorValue?: List<StringFilter>;
  ResourceContainerImageName?: List<StringFilter>;
  MalwareType?: List<StringFilter>;
  ThreatIntelIndicatorSource?: List<StringFilter>;
  ResourceAwsIamAccessKeyCreatedAt?: List<DateFilter>;
  ResourceAwsEc2InstanceType?: List<StringFilter>;
  RecommendationText?: List<StringFilter>;
  AwsAccountName?: List<StringFilter>;
  FindingProviderFieldsRelatedFindingsProductArn?: List<StringFilter>;
  AwsAccountId?: List<StringFilter>;
  Id?: List<StringFilter>;
  ProcessParentPid?: List<NumberFilter>;
  ResourceApplicationName?: List<StringFilter>;
  ProductArn?: List<StringFilter>;
  ResourceAwsEc2InstanceIpV6Addresses?: List<IpFilter>;
  MalwareName?: List<StringFilter>;
  Description?: List<StringFilter>;
  ResourceContainerLaunchedAt?: List<DateFilter>;
  ProcessPid?: List<NumberFilter>;
  NoteText?: List<StringFilter>;
  ResourceAwsEc2InstanceKeyName?: List<StringFilter>;
  FindingProviderFieldsTypes?: List<StringFilter>;
  ComplianceSecurityControlId?: List<StringFilter>;
  NoteUpdatedBy?: List<StringFilter>;
  VerificationState?: List<StringFilter>;
  GeneratorId?: List<StringFilter>;
  ResourceType?: List<StringFilter>;
  NetworkProtocol?: List<StringFilter>;
  UpdatedAt?: List<DateFilter>;
  ProcessPath?: List<StringFilter>;
  WorkflowStatus?: List<StringFilter>;
  ResourceContainerName?: List<StringFilter>;
  Type?: List<StringFilter>;
  ResourceId?: List<StringFilter>;
  NetworkDestinationDomain?: List<StringFilter>;
  ProductName?: List<StringFilter>;
  ResourceTags?: List<MapFilter>;
  ResourceAwsEc2InstanceVpcId?: List<StringFilter>;
  ResourceAwsS3BucketOwnerName?: List<StringFilter>;
  LastObservedAt?: List<DateFilter>;
  ComplianceSecurityControlParametersName?: List<StringFilter>;
  NetworkSourceIpV4?: List<IpFilter>;
  ProcessLaunchedAt?: List<DateFilter>;
  ResourceAwsEc2InstanceLaunchedAt?: List<DateFilter>;
  NoteUpdatedAt?: List<DateFilter>;
  ThreatIntelIndicatorType?: List<StringFilter>;
  CompanyName?: List<StringFilter>;
  ResourceRegion?: List<StringFilter>;
  ResourceAwsIamAccessKeyStatus?: List<StringFilter>;
  NetworkSourceIpV6?: List<IpFilter>;
  Confidence?: List<NumberFilter>;
  ProductFields?: List<MapFilter>;
  ThreatIntelIndicatorLastObservedAt?: List<DateFilter>;
  ResourceAwsEc2InstanceSubnetId?: List<StringFilter>;
  ComplianceAssociatedStandardsId?: List<StringFilter>;
  ResourceAwsEc2InstanceImageId?: List<StringFilter>;
  ResourceAwsEc2InstanceIpV4Addresses?: List<IpFilter>;
  RelatedFindingsId?: List<StringFilter>;
  ProcessTerminatedAt?: List<DateFilter>;
  ResourceContainerImageId?: List<StringFilter>;
  NetworkDestinationIpV4?: List<IpFilter>;
  Region?: List<StringFilter>;
  NetworkDestinationIpV6?: List<IpFilter>;
  VulnerabilitiesExploitAvailable?: List<StringFilter>;
  FindingProviderFieldsCriticality?: List<NumberFilter>;
  NetworkDestinationPort?: List<NumberFilter>;
  ResourceDetailsOther?: List<MapFilter>;
  FindingProviderFieldsSeverityLabel?: List<StringFilter>;
  ThreatIntelIndicatorSourceUrl?: List<StringFilter>;
  FindingProviderFieldsSeverityOriginal?: List<StringFilter>;
  MalwarePath?: List<StringFilter>;
  Sample?: List<BooleanFilter>;
  RecordState?: List<StringFilter>;
  Title?: List<StringFilter>;
  WorkflowState?: List<StringFilter>;
  NetworkSourceMac?: List<StringFilter>;
  ResourceAwsS3BucketOwnerId?: List<StringFilter>;
  VulnerabilitiesFixAvailable?: List<StringFilter>;
  constructor(properties: AwsSecurityFindingFilters) {
    Object.assign(this, properties);
  }
}

export class BooleanFilter {
  Value!: Value<boolean>;
  constructor(properties: BooleanFilter) {
    Object.assign(this, properties);
  }
}

export class DateFilter {
  DateRange?: DateRange;
  Start?: Value<string>;
  End?: Value<string>;
  constructor(properties: DateFilter) {
    Object.assign(this, properties);
  }
}

export class DateRange {
  Value!: Value<number>;
  Unit!: Value<string>;
  constructor(properties: DateRange) {
    Object.assign(this, properties);
  }
}

export class IpFilter {
  Cidr!: Value<string>;
  constructor(properties: IpFilter) {
    Object.assign(this, properties);
  }
}

export class MapFilter {
  Comparison!: Value<string>;
  Value!: Value<string>;
  Key!: Value<string>;
  constructor(properties: MapFilter) {
    Object.assign(this, properties);
  }
}

export class NumberFilter {
  Gte?: Value<number>;
  Eq?: Value<number>;
  Lte?: Value<number>;
  constructor(properties: NumberFilter) {
    Object.assign(this, properties);
  }
}

export class StringFilter {
  Comparison!: Value<string>;
  Value!: Value<string>;
  constructor(properties: StringFilter) {
    Object.assign(this, properties);
  }
}
export interface InsightProperties {
  Filters: AwsSecurityFindingFilters;
  GroupByAttribute: Value<string>;
  Name: Value<string>;
}
export default class Insight extends ResourceBase<InsightProperties> {
  static AwsSecurityFindingFilters = AwsSecurityFindingFilters;
  static BooleanFilter = BooleanFilter;
  static DateFilter = DateFilter;
  static DateRange = DateRange;
  static IpFilter = IpFilter;
  static MapFilter = MapFilter;
  static NumberFilter = NumberFilter;
  static StringFilter = StringFilter;
  constructor(properties: InsightProperties) {
    super('AWS::SecurityHub::Insight', properties);
  }
}
