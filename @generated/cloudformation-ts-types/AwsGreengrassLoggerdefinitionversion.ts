// This file is auto-generated. Do not edit manually.
// Source: aws-greengrass-loggerdefinitionversion.json

/** Resource Type definition for AWS::Greengrass::LoggerDefinitionVersion */
export type AwsGreengrassLoggerdefinitionversion = {
  Id?: string;
  LoggerDefinitionId: string;
  /** @uniqueItems false */
  Loggers: {
    Space?: number;
    Type: string;
    Level: string;
    Id: string;
    Component: string;
  }[];
};
