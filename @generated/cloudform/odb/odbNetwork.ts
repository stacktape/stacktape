import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class ManagedS3BackupAccess {
  Status?: Value<string>;
  Ipv4Addresses?: List<Value<string>>;
  constructor(properties: ManagedS3BackupAccess) {
    Object.assign(this, properties);
  }
}

export class ManagedServices {
  ManagedServicesIpv4Cidrs?: List<Value<string>>;
  ResourceGatewayArn?: Value<string>;
  ManagedS3BackupAccess?: ManagedS3BackupAccess;
  ServiceNetworkEndpoint?: ServiceNetworkEndpoint;
  ZeroEtlAccess?: ZeroEtlAccess;
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
  ZeroEtlAccess?: Value<string>;
  DeleteAssociatedResources?: Value<boolean>;
  AvailabilityZoneId?: Value<string>;
  DisplayName?: Value<string>;
  S3PolicyDocument?: Value<string>;
  AvailabilityZone?: Value<string>;
  BackupSubnetCidr?: Value<string>;
  ClientSubnetCidr?: Value<string>;
  Tags?: List<ResourceTag>;
  S3Access?: Value<string>;
}
export default class OdbNetwork extends ResourceBase<OdbNetworkProperties> {
  static ManagedS3BackupAccess = ManagedS3BackupAccess;
  static ManagedServices = ManagedServices;
  static S3Access = S3Access;
  static ServiceNetworkEndpoint = ServiceNetworkEndpoint;
  static ZeroEtlAccess = ZeroEtlAccess;
  constructor(properties?: OdbNetworkProperties) {
    super('AWS::ODB::OdbNetwork', properties || {});
  }
}
