// This file is auto-generated. Do not edit manually.
// Source: aws-appstream-imagebuilder.json

/** Resource Type definition for AWS::AppStream::ImageBuilder */
export type AwsAppstreamImagebuilder = {
  Description?: string;
  VpcConfig?: {
    /** @uniqueItems false */
    SecurityGroupIds?: string[];
    /** @uniqueItems false */
    SubnetIds?: string[];
  };
  EnableDefaultInternetAccess?: boolean;
  DomainJoinInfo?: {
    OrganizationalUnitDistinguishedName?: string;
    DirectoryName?: string;
  };
  AppstreamAgentVersion?: string;
  Name: string;
  ImageName?: string;
  DisplayName?: string;
  IamRoleArn?: string;
  InstanceType: string;
  /** @uniqueItems false */
  Tags?: {
    Value: string;
    Key: string;
  }[];
  StreamingUrl?: string;
  ImageArn?: string;
  /** @uniqueItems false */
  AccessEndpoints?: {
    EndpointType: string;
    VpceId: string;
  }[];
};
