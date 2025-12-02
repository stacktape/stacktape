// This file is auto-generated. Do not edit manually.
// Source: aws-appstream-entitlement.json

/** Resource Type definition for AWS::AppStream::Entitlement */
export type AwsAppstreamEntitlement = {
  Name: string;
  StackName: string;
  Description?: string;
  AppVisibility: string;
  /** @uniqueItems true */
  Attributes: {
    Name: string;
    Value: string;
  }[];
  CreatedTime?: string;
  LastModifiedTime?: string;
};
