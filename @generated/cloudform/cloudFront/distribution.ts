import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class CacheBehavior {
  Compress?: Value<boolean>;
  FunctionAssociations?: List<FunctionAssociation>;
  LambdaFunctionAssociations?: List<LambdaFunctionAssociation>;
  TargetOriginId!: Value<string>;
  ViewerProtocolPolicy!: Value<string>;
  ResponseHeadersPolicyId?: Value<string>;
  GrpcConfig?: GrpcConfig;
  RealtimeLogConfigArn?: Value<string>;
  TrustedSigners?: List<Value<string>>;
  DefaultTTL?: Value<number>;
  FieldLevelEncryptionId?: Value<string>;
  TrustedKeyGroups?: List<Value<string>>;
  AllowedMethods?: List<Value<string>>;
  PathPattern!: Value<string>;
  CachedMethods?: List<Value<string>>;
  SmoothStreaming?: Value<boolean>;
  ForwardedValues?: ForwardedValues;
  OriginRequestPolicyId?: Value<string>;
  MinTTL?: Value<number>;
  CachePolicyId?: Value<string>;
  MaxTTL?: Value<number>;
  constructor(properties: CacheBehavior) {
    Object.assign(this, properties);
  }
}

export class Cookies {
  WhitelistedNames?: List<Value<string>>;
  Forward!: Value<string>;
  constructor(properties: Cookies) {
    Object.assign(this, properties);
  }
}

export class CustomErrorResponse {
  ResponseCode?: Value<number>;
  ErrorCachingMinTTL?: Value<number>;
  ErrorCode!: Value<number>;
  ResponsePagePath?: Value<string>;
  constructor(properties: CustomErrorResponse) {
    Object.assign(this, properties);
  }
}

export class CustomOriginConfig {
  IpAddressType?: Value<string>;
  OriginReadTimeout?: Value<number>;
  HTTPSPort?: Value<number>;
  OriginKeepaliveTimeout?: Value<number>;
  OriginSSLProtocols?: List<Value<string>>;
  HTTPPort?: Value<number>;
  OriginProtocolPolicy!: Value<string>;
  constructor(properties: CustomOriginConfig) {
    Object.assign(this, properties);
  }
}

export class DefaultCacheBehavior {
  Compress?: Value<boolean>;
  FunctionAssociations?: List<FunctionAssociation>;
  LambdaFunctionAssociations?: List<LambdaFunctionAssociation>;
  TargetOriginId!: Value<string>;
  ViewerProtocolPolicy!: Value<string>;
  ResponseHeadersPolicyId?: Value<string>;
  GrpcConfig?: GrpcConfig;
  RealtimeLogConfigArn?: Value<string>;
  TrustedSigners?: List<Value<string>>;
  DefaultTTL?: Value<number>;
  FieldLevelEncryptionId?: Value<string>;
  TrustedKeyGroups?: List<Value<string>>;
  AllowedMethods?: List<Value<string>>;
  CachedMethods?: List<Value<string>>;
  SmoothStreaming?: Value<boolean>;
  ForwardedValues?: ForwardedValues;
  OriginRequestPolicyId?: Value<string>;
  MinTTL?: Value<number>;
  CachePolicyId?: Value<string>;
  MaxTTL?: Value<number>;
  constructor(properties: DefaultCacheBehavior) {
    Object.assign(this, properties);
  }
}

export class Definition {
  StringSchema?: StringSchema;
  constructor(properties: Definition) {
    Object.assign(this, properties);
  }
}

export class DistributionConfig {
  Logging?: Logging;
  Comment?: Value<string>;
  DefaultRootObject?: Value<string>;
  Origins?: List<Origin>;
  ViewerCertificate?: ViewerCertificate;
  AnycastIpListId?: Value<string>;
  PriceClass?: Value<string>;
  CustomOrigin?: LegacyCustomOrigin;
  S3Origin?: LegacyS3Origin;
  DefaultCacheBehavior!: DefaultCacheBehavior;
  Staging?: Value<boolean>;
  CustomErrorResponses?: List<CustomErrorResponse>;
  ContinuousDeploymentPolicyId?: Value<string>;
  OriginGroups?: OriginGroups;
  Enabled!: Value<boolean>;
  Aliases?: List<Value<string>>;
  IPV6Enabled?: Value<boolean>;
  TenantConfig?: TenantConfig;
  ConnectionMode?: Value<string>;
  CNAMEs?: List<Value<string>>;
  WebACLId?: Value<string>;
  HttpVersion?: Value<string>;
  Restrictions?: Restrictions;
  CacheBehaviors?: List<CacheBehavior>;
  constructor(properties: DistributionConfig) {
    Object.assign(this, properties);
  }
}

export class ForwardedValues {
  Cookies?: Cookies;
  Headers?: List<Value<string>>;
  QueryString!: Value<boolean>;
  QueryStringCacheKeys?: List<Value<string>>;
  constructor(properties: ForwardedValues) {
    Object.assign(this, properties);
  }
}

export class FunctionAssociation {
  FunctionARN?: Value<string>;
  EventType?: Value<string>;
  constructor(properties: FunctionAssociation) {
    Object.assign(this, properties);
  }
}

export class GeoRestriction {
  Locations?: List<Value<string>>;
  RestrictionType!: Value<string>;
  constructor(properties: GeoRestriction) {
    Object.assign(this, properties);
  }
}

export class GrpcConfig {
  Enabled!: Value<boolean>;
  constructor(properties: GrpcConfig) {
    Object.assign(this, properties);
  }
}

export class LambdaFunctionAssociation {
  IncludeBody?: Value<boolean>;
  EventType?: Value<string>;
  LambdaFunctionARN?: Value<string>;
  constructor(properties: LambdaFunctionAssociation) {
    Object.assign(this, properties);
  }
}

export class LegacyCustomOrigin {
  HTTPSPort?: Value<number>;
  OriginSSLProtocols!: List<Value<string>>;
  DNSName!: Value<string>;
  HTTPPort?: Value<number>;
  OriginProtocolPolicy!: Value<string>;
  constructor(properties: LegacyCustomOrigin) {
    Object.assign(this, properties);
  }
}

export class LegacyS3Origin {
  OriginAccessIdentity?: Value<string>;
  DNSName!: Value<string>;
  constructor(properties: LegacyS3Origin) {
    Object.assign(this, properties);
  }
}

export class Logging {
  IncludeCookies?: Value<boolean>;
  Bucket?: Value<string>;
  Prefix?: Value<string>;
  constructor(properties: Logging) {
    Object.assign(this, properties);
  }
}

export class Origin {
  ConnectionTimeout?: Value<number>;
  OriginAccessControlId?: Value<string>;
  ConnectionAttempts?: Value<number>;
  OriginCustomHeaders?: List<OriginCustomHeader>;
  DomainName!: Value<string>;
  OriginShield?: OriginShield;
  S3OriginConfig?: S3OriginConfig;
  VpcOriginConfig?: VpcOriginConfig;
  OriginPath?: Value<string>;
  ResponseCompletionTimeout?: Value<number>;
  Id!: Value<string>;
  CustomOriginConfig?: CustomOriginConfig;
  constructor(properties: Origin) {
    Object.assign(this, properties);
  }
}

export class OriginCustomHeader {
  HeaderValue!: Value<string>;
  HeaderName!: Value<string>;
  constructor(properties: OriginCustomHeader) {
    Object.assign(this, properties);
  }
}

export class OriginGroup {
  SelectionCriteria?: Value<string>;
  Id!: Value<string>;
  FailoverCriteria!: OriginGroupFailoverCriteria;
  Members!: OriginGroupMembers;
  constructor(properties: OriginGroup) {
    Object.assign(this, properties);
  }
}

export class OriginGroupFailoverCriteria {
  StatusCodes!: StatusCodes;
  constructor(properties: OriginGroupFailoverCriteria) {
    Object.assign(this, properties);
  }
}

export class OriginGroupMember {
  OriginId!: Value<string>;
  constructor(properties: OriginGroupMember) {
    Object.assign(this, properties);
  }
}

export class OriginGroupMembers {
  Quantity!: Value<number>;
  Items!: List<OriginGroupMember>;
  constructor(properties: OriginGroupMembers) {
    Object.assign(this, properties);
  }
}

export class OriginGroups {
  Quantity!: Value<number>;
  Items?: List<OriginGroup>;
  constructor(properties: OriginGroups) {
    Object.assign(this, properties);
  }
}

export class OriginShield {
  OriginShieldRegion?: Value<string>;
  Enabled?: Value<boolean>;
  constructor(properties: OriginShield) {
    Object.assign(this, properties);
  }
}

export class ParameterDefinition {
  Definition!: Definition;
  Name!: Value<string>;
  constructor(properties: ParameterDefinition) {
    Object.assign(this, properties);
  }
}

export class Restrictions {
  GeoRestriction!: GeoRestriction;
  constructor(properties: Restrictions) {
    Object.assign(this, properties);
  }
}

export class S3OriginConfig {
  OriginReadTimeout?: Value<number>;
  OriginAccessIdentity?: Value<string>;
  constructor(properties: S3OriginConfig) {
    Object.assign(this, properties);
  }
}

export class StatusCodes {
  Quantity!: Value<number>;
  Items!: List<Value<number>>;
  constructor(properties: StatusCodes) {
    Object.assign(this, properties);
  }
}

export class StringSchema {
  Comment?: Value<string>;
  DefaultValue?: Value<string>;
  Required!: Value<boolean>;
  constructor(properties: StringSchema) {
    Object.assign(this, properties);
  }
}

export class TenantConfig {
  ParameterDefinitions?: List<ParameterDefinition>;
  constructor(properties: TenantConfig) {
    Object.assign(this, properties);
  }
}

export class ViewerCertificate {
  IamCertificateId?: Value<string>;
  SslSupportMethod?: Value<string>;
  MinimumProtocolVersion?: Value<string>;
  CloudFrontDefaultCertificate?: Value<boolean>;
  AcmCertificateArn?: Value<string>;
  constructor(properties: ViewerCertificate) {
    Object.assign(this, properties);
  }
}

export class VpcOriginConfig {
  OriginReadTimeout?: Value<number>;
  VpcOriginId!: Value<string>;
  OriginKeepaliveTimeout?: Value<number>;
  OwnerAccountId?: Value<string>;
  constructor(properties: VpcOriginConfig) {
    Object.assign(this, properties);
  }
}
export interface DistributionProperties {
  DistributionConfig: DistributionConfig;
  Tags?: List<ResourceTag>;
}
export default class Distribution extends ResourceBase<DistributionProperties> {
  static CacheBehavior = CacheBehavior;
  static Cookies = Cookies;
  static CustomErrorResponse = CustomErrorResponse;
  static CustomOriginConfig = CustomOriginConfig;
  static DefaultCacheBehavior = DefaultCacheBehavior;
  static Definition = Definition;
  static DistributionConfig = DistributionConfig;
  static ForwardedValues = ForwardedValues;
  static FunctionAssociation = FunctionAssociation;
  static GeoRestriction = GeoRestriction;
  static GrpcConfig = GrpcConfig;
  static LambdaFunctionAssociation = LambdaFunctionAssociation;
  static LegacyCustomOrigin = LegacyCustomOrigin;
  static LegacyS3Origin = LegacyS3Origin;
  static Logging = Logging;
  static Origin = Origin;
  static OriginCustomHeader = OriginCustomHeader;
  static OriginGroup = OriginGroup;
  static OriginGroupFailoverCriteria = OriginGroupFailoverCriteria;
  static OriginGroupMember = OriginGroupMember;
  static OriginGroupMembers = OriginGroupMembers;
  static OriginGroups = OriginGroups;
  static OriginShield = OriginShield;
  static ParameterDefinition = ParameterDefinition;
  static Restrictions = Restrictions;
  static S3OriginConfig = S3OriginConfig;
  static StatusCodes = StatusCodes;
  static StringSchema = StringSchema;
  static TenantConfig = TenantConfig;
  static ViewerCertificate = ViewerCertificate;
  static VpcOriginConfig = VpcOriginConfig;
  constructor(properties: DistributionProperties) {
    super('AWS::CloudFront::Distribution', properties);
  }
}
