import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class DateFilter {
  EndInclusive?: Value<number>;
  StartInclusive?: Value<number>;
  constructor(properties: DateFilter) {
    Object.assign(this, properties);
  }
}

export class FilterCriteria {
  ResourceTags?: List<MapFilter>;
  Ec2InstanceImageId?: List<StringFilter>;
  FirstObservedAt?: List<DateFilter>;
  InspectorScore?: List<NumberFilter>;
  Ec2InstanceVpcId?: List<StringFilter>;
  LambdaFunctionName?: List<StringFilter>;
  LambdaFunctionRuntime?: List<StringFilter>;
  LastObservedAt?: List<DateFilter>;
  EcrImagePushedAt?: List<DateFilter>;
  LambdaFunctionLayers?: List<StringFilter>;
  FixAvailable?: List<StringFilter>;
  ExploitAvailable?: List<StringFilter>;
  EcrImageArchitecture?: List<StringFilter>;
  RelatedVulnerabilities?: List<StringFilter>;
  EcrImageTags?: List<StringFilter>;
  VulnerabilityId?: List<StringFilter>;
  ComponentType?: List<StringFilter>;
  LambdaFunctionExecutionRoleArn?: List<StringFilter>;
  VendorSeverity?: List<StringFilter>;
  CodeVulnerabilityDetectorTags?: List<StringFilter>;
  CodeVulnerabilityDetectorName?: List<StringFilter>;
  EcrImageRepositoryName?: List<StringFilter>;
  Title?: List<StringFilter>;
  ResourceType?: List<StringFilter>;
  Severity?: List<StringFilter>;
  NetworkProtocol?: List<StringFilter>;
  UpdatedAt?: List<DateFilter>;
  CodeVulnerabilityFilePath?: List<StringFilter>;
  EcrImageHash?: List<StringFilter>;
  LambdaFunctionLastModifiedAt?: List<DateFilter>;
  PortRange?: List<PortRangeFilter>;
  VulnerabilitySource?: List<StringFilter>;
  Ec2InstanceSubnetId?: List<StringFilter>;
  FindingArn?: List<StringFilter>;
  ResourceId?: List<StringFilter>;
  FindingStatus?: List<StringFilter>;
  VulnerablePackages?: List<PackageFilter>;
  AwsAccountId?: List<StringFilter>;
  EpssScore?: List<NumberFilter>;
  ComponentId?: List<StringFilter>;
  EcrImageRegistry?: List<StringFilter>;
  FindingType?: List<StringFilter>;
  constructor(properties: FilterCriteria) {
    Object.assign(this, properties);
  }
}

export class MapFilter {
  Comparison!: Value<string>;
  Value?: Value<string>;
  Key?: Value<string>;
  constructor(properties: MapFilter) {
    Object.assign(this, properties);
  }
}

export class NumberFilter {
  LowerInclusive?: Value<number>;
  UpperInclusive?: Value<number>;
  constructor(properties: NumberFilter) {
    Object.assign(this, properties);
  }
}

export class PackageFilter {
  FilePath?: StringFilter;
  Architecture?: StringFilter;
  Version?: StringFilter;
  Epoch?: NumberFilter;
  SourceLayerHash?: StringFilter;
  SourceLambdaLayerArn?: StringFilter;
  Release?: StringFilter;
  Name?: StringFilter;
  constructor(properties: PackageFilter) {
    Object.assign(this, properties);
  }
}

export class PortRangeFilter {
  BeginInclusive?: Value<number>;
  EndInclusive?: Value<number>;
  constructor(properties: PortRangeFilter) {
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
export interface FilterProperties {
  Description?: Value<string>;
  FilterCriteria: FilterCriteria;
  FilterAction: Value<string>;
  Tags?: { [key: string]: Value<string> };
  Name: Value<string>;
}
export default class Filter extends ResourceBase<FilterProperties> {
  static DateFilter = DateFilter;
  static FilterCriteria = FilterCriteria;
  static MapFilter = MapFilter;
  static NumberFilter = NumberFilter;
  static PackageFilter = PackageFilter;
  static PortRangeFilter = PortRangeFilter;
  static StringFilter = StringFilter;
  constructor(properties: FilterProperties) {
    super('AWS::InspectorV2::Filter', properties);
  }
}
