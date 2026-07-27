// This file is auto-generated. Do not edit manually.
// Source: aws-greengrass-loggerdefinition.json

/** Resource Type definition for AWS::Greengrass::LoggerDefinition */
export type AwsGreengrassLoggerdefinition = {
  LatestVersionArn?: string;
  Id?: string;
  Arn?: string;
  Name: string;
  InitialVersion?: {
    /** @uniqueItems false */
    Loggers: {
      Space?: number;
      Type: string;
      Level: string;
      Id: string;
      Component: string;
    }[];
  };
  Tags?: Record<string, unknown>;
};
