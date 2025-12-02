// This file is auto-generated. Do not edit manually.
// Source: aws-securitylake-awslogsource.json

/** Resource Type definition for AWS::SecurityLake::AwsLogSource */
export type AwsSecuritylakeAwslogsource = {
  /**
   * AWS account where you want to collect logs from.
   * @uniqueItems true
   */
  Accounts?: string[];
  /**
   * The ARN for the data lake.
   * @minLength 1
   * @maxLength 256
   */
  DataLakeArn: string;
  /** The name for a AWS source. This must be a Regionally unique value. */
  SourceName: string;
  /**
   * The version for a AWS source. This must be a Regionally unique value.
   * @pattern ^(latest|[0-9]\.[0-9])$
   */
  SourceVersion: string;
};
