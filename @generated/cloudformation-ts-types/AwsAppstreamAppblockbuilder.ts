// This file is auto-generated. Do not edit manually.
// Source: aws-appstream-appblockbuilder.json

/** Resource Type definition for AWS::AppStream::AppBlockBuilder. */
export type AwsAppstreamAppblockbuilder = {
  Name: string;
  Arn?: string;
  Description?: string;
  DisplayName?: string;
  Platform: string;
  /** @uniqueItems true */
  AccessEndpoints?: {
    EndpointType: string;
    VpceId: string;
  }[];
  /** @uniqueItems true */
  Tags?: {
    Key: string;
    Value: string;
  }[];
  VpcConfig: {
    /** @uniqueItems false */
    SecurityGroupIds?: string[];
    /** @uniqueItems false */
    SubnetIds?: string[];
  };
  EnableDefaultInternetAccess?: boolean;
  IamRoleArn?: string;
  CreatedTime?: string;
  InstanceType: string;
  /** @uniqueItems true */
  AppBlockArns?: string[];
};
