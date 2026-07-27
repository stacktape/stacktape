import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class CrossRegionS3RestoreSourcesAccess {
  Status?: Value<string>;
  Ipv4Addresses?: List<Value<string>>;
  Region?: Value<string>;
  constructor(properties: CrossRegionS3RestoreSourcesAccess) {
    Object.assign(this, properties);
  }
}

export class KmsAccess {
  Status?: Value<string>;
  Ipv4Addresses?: List<Value<string>>;
  DomainName?: Value<string>;
  KmsPolicyDocument?: Value<string>;
  constructor(properties: KmsAccess) {
    Object.assign(this, properties);
  }
}

export class ManagedS3BackupAccess {
  Status?: Value<string>;
  Ipv4Addresses?: List<Value<string>>;
  constructor(properties: ManagedS3BackupAccess) {
    Object.assign(this, properties);
  }
}

export class ManagedServices {
  ManagedServicesIpv4Cidrs?: List<Value<string>>;
  KmsAccess?: KmsAccess;
  ResourceGatewayArn?: Value<string>;
  ManagedS3BackupAccess?: ManagedS3BackupAccess;
  ServiceNetworkEndpoint?: ServiceNetworkEndpoint;
  ZeroEtlAccess?: ZeroEtlAccess;
  StsAccess?: StsAccess;
  CrossRegionS3RestoreSourcesAccess?: List<CrossRegionS3RestoreSourcesAccess>;
  ServiceNetworkArn?: Value<string>;
  S3Access?: S3Access;
  constructor(properties: ManagedServices) {
    Object.assign(this, properties);
  }
}

export class S3Access {
  Status?: Value<string>;
  Ipv4Addresses?: List<Value<string>>;
  DomainName?: Value<string>;
  S3PolicyDocument?: Value<string>;
  constructor(properties: S3Access) {
    Object.assign(this, properties);
  }
}

export class ServiceNetworkEndpoint {
  VpcEndpointType?: Value<string>;
  VpcEndpointId?: Value<string>;
  constructor(properties: ServiceNetworkEndpoint) {
    Object.assign(this, properties);
  }
}

export class StsAccess {
  Status?: Value<string>;
  Ipv4Addresses?: List<Value<string>>;
  DomainName?: Value<string>;
  StsPolicyDocument?: Value<string>;
  constructor(properties: StsAccess) {
    Object.assign(this, properties);
  }
}

export class ZeroEtlAccess {
  Status?: Value<string>;
  Cidr?: Value<string>;
  constructor(properties: ZeroEtlAccess) {
    Object.assign(this, properties);
  }
}
export interface OdbNetworkProperties {
  DefaultDnsPrefix?: Value<string>;
  CustomDomainName?: Value<string>;
  StsAccess?: Value<string>;
  ZeroEtlAccess?: Value<string>;
  AvailabilityZoneId?: Value<string>;
  AvailabilityZone?: Value<string>;
  BackupSubnetCidr?: Value<string>;
  ClientSubnetCidr?: Value<string>;
  S3Access?: Value<string>;
  StsPolicyDocument?: Value<string>;
  KmsAccess?: Value<string>;
  DeleteAssociatedResources?: Value<boolean>;
  DisplayName?: Value<string>;
  S3PolicyDocument?: Value<string>;
  KmsPolicyDocument?: Value<string>;
  CrossRegionS3RestoreSources?: List<Value<string>>;
  Tags?: List<ResourceTag>;
}
export default class OdbNetwork extends ResourceBase<OdbNetworkProperties> {
  static CrossRegionS3RestoreSourcesAccess = CrossRegionS3RestoreSourcesAccess;
  static KmsAccess = KmsAccess;
  static ManagedS3BackupAccess = ManagedS3BackupAccess;
  static ManagedServices = ManagedServices;
  static S3Access = S3Access;
  static ServiceNetworkEndpoint = ServiceNetworkEndpoint;
  static StsAccess = StsAccess;
  static ZeroEtlAccess = ZeroEtlAccess;
  constructor(properties?: OdbNetworkProperties) {
    super('AWS::ODB::OdbNetwork', properties || {});
  }
}
