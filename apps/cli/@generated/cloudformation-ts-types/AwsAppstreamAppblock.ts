// This file is auto-generated. Do not edit manually.
// Source: aws-appstream-appblock.json

/** Resource Type definition for AWS::AppStream::AppBlock */
export type AwsAppstreamAppblock = {
  Name: string;
  Arn?: string;
  Description?: string;
  DisplayName?: string;
  SourceS3Location: {
    S3Bucket: string;
    S3Key?: string;
  };
  SetupScriptDetails?: {
    ScriptS3Location: {
      S3Bucket: string;
      S3Key?: string;
    };
    ExecutablePath: string;
    ExecutableParameters?: string;
    TimeoutInSeconds: number;
  };
  /** @uniqueItems true */
  Tags?: ({
    Key: string;
    Value: string;
  } | {
    TagKey: string;
    TagValue: string;
  })[];
  CreatedTime?: string;
  PackagingType?: string;
  PostSetupScriptDetails?: {
    ScriptS3Location: {
      S3Bucket: string;
      S3Key?: string;
    };
    ExecutablePath: string;
    ExecutableParameters?: string;
    TimeoutInSeconds: number;
  };
};
