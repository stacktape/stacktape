// This file is auto-generated. Do not edit manually.
// Source: aws-greengrass-connectordefinition.json

/** Resource Type definition for AWS::Greengrass::ConnectorDefinition */
export type AwsGreengrassConnectordefinition = {
  LatestVersionArn?: string;
  Id?: string;
  Arn?: string;
  Name: string;
  InitialVersion?: {
    /** @uniqueItems false */
    Connectors: {
      ConnectorArn: string;
      Parameters?: Record<string, unknown>;
      Id: string;
    }[];
  };
  Tags?: Record<string, unknown>;
};
