// This file is auto-generated. Do not edit manually.
// Source: aws-appstream-application.json

/** Resource Type definition for AWS::AppStream::Application */
export type AwsAppstreamApplication = {
  Name: string;
  DisplayName?: string;
  Description?: string;
  LaunchPath: string;
  LaunchParameters?: string;
  WorkingDirectory?: string;
  /** @uniqueItems true */
  InstanceFamilies: string[];
  IconS3Location: {
    S3Bucket: string;
    S3Key: string;
  };
  Arn?: string;
  AppBlockArn: string;
  /** @uniqueItems true */
  Platforms: string[];
  /** @uniqueItems true */
  Tags?: ({
    Key: string;
    Value: string;
  } | {
    TagKey: string;
    TagValue: string;
  })[];
  /** @uniqueItems true */
  AttributesToDelete?: string[];
  CreatedTime?: string;
};
