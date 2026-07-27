// This file is auto-generated. Do not edit manually.
// Source: aws-opsworks-app.json

/** Resource Type definition for AWS::OpsWorks::App */
export type AwsOpsworksApp = {
  Id?: string;
  AppSource?: {
    Password?: string;
    Revision?: string;
    SshKey?: string;
    Type?: string;
    Url?: string;
    Username?: string;
  };
  Attributes?: Record<string, string>;
  /** @uniqueItems true */
  DataSources?: {
    Arn?: string;
    DatabaseName?: string;
    Type?: string;
  }[];
  Description?: string;
  /** @uniqueItems false */
  Domains?: string[];
  EnableSsl?: boolean;
  /** @uniqueItems false */
  Environment?: {
    Key: string;
    Secure?: boolean;
    Value: string;
  }[];
  Name: string;
  Shortname?: string;
  SslConfiguration?: {
    Certificate?: string;
    Chain?: string;
    PrivateKey?: string;
  };
  StackId: string;
  Type: string;
};
