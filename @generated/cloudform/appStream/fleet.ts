import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class ComputeCapacity {
  DesiredInstances?: Value<number>;
  DesiredSessions?: Value<number>;
  constructor(properties: ComputeCapacity) {
    Object.assign(this, properties);
  }
}

export class DomainJoinInfo {
  OrganizationalUnitDistinguishedName?: Value<string>;
  DirectoryName?: Value<string>;
  constructor(properties: DomainJoinInfo) {
    Object.assign(this, properties);
  }
}

export class S3Location {
  S3Bucket!: Value<string>;
  S3Key!: Value<string>;
  constructor(properties: S3Location) {
    Object.assign(this, properties);
  }
}

export class VpcConfig {
  SubnetIds?: List<Value<string>>;
  SecurityGroupIds?: List<Value<string>>;
  constructor(properties: VpcConfig) {
    Object.assign(this, properties);
  }
}
export interface FleetProperties {
  Description?: Value<string>;
  ComputeCapacity?: ComputeCapacity;
  Platform?: Value<string>;
  VpcConfig?: VpcConfig;
  FleetType?: Value<string>;
  EnableDefaultInternetAccess?: Value<boolean>;
  DomainJoinInfo?: DomainJoinInfo;
  SessionScriptS3Location?: S3Location;
  Name: Value<string>;
  ImageName?: Value<string>;
  MaxUserDurationInSeconds?: Value<number>;
  IdleDisconnectTimeoutInSeconds?: Value<number>;
  UsbDeviceFilterStrings?: List<Value<string>>;
  DisconnectTimeoutInSeconds?: Value<number>;
  DisplayName?: Value<string>;
  StreamView?: Value<string>;
  IamRoleArn?: Value<string>;
  MaxSessionsPerInstance?: Value<number>;
  InstanceType: Value<string>;
  MaxConcurrentSessions?: Value<number>;
  Tags?: List<ResourceTag>;
  ImageArn?: Value<string>;
}
export default class Fleet extends ResourceBase<FleetProperties> {
  static ComputeCapacity = ComputeCapacity;
  static DomainJoinInfo = DomainJoinInfo;
  static S3Location = S3Location;
  static VpcConfig = VpcConfig;
  constructor(properties: FleetProperties) {
    super('AWS::AppStream::Fleet', properties);
  }
}
