// This file is auto-generated. Do not edit manually.
// Source: aws-appstream-fleet.json

/** Resource Type definition for AWS::AppStream::Fleet */
export type AwsAppstreamFleet = {
  Description?: string;
  ComputeCapacity?: {
    DesiredInstances?: number;
    DesiredSessions?: number;
  };
  Platform?: string;
  VpcConfig?: {
    /** @uniqueItems false */
    SubnetIds?: string[];
    /** @uniqueItems false */
    SecurityGroupIds?: string[];
  };
  FleetType?: string;
  EnableDefaultInternetAccess?: boolean;
  DomainJoinInfo?: {
    OrganizationalUnitDistinguishedName?: string;
    DirectoryName?: string;
  };
  SessionScriptS3Location?: {
    S3Bucket: string;
    S3Key: string;
  };
  Name: string;
  ImageName?: string;
  MaxUserDurationInSeconds?: number;
  IdleDisconnectTimeoutInSeconds?: number;
  /** @uniqueItems false */
  UsbDeviceFilterStrings?: string[];
  DisconnectTimeoutInSeconds?: number;
  DisplayName?: string;
  StreamView?: string;
  IamRoleArn?: string;
  MaxSessionsPerInstance?: number;
  Id?: string;
  InstanceType: string;
  MaxConcurrentSessions?: number;
  /** @uniqueItems false */
  Tags?: {
    Value: string;
    Key: string;
  }[];
  ImageArn?: string;
};
