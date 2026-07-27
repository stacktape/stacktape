// This file is auto-generated. Do not edit manually.
// Source: aws-greengrass-connectordefinitionversion.json

/** Resource Type definition for AWS::Greengrass::ConnectorDefinitionVersion */
export type AwsGreengrassConnectordefinitionversion = {
  Id?: string;
  /** @uniqueItems false */
  Connectors: {
    ConnectorArn: string;
    Parameters?: Record<string, unknown>;
    Id: string;
  }[];
  ConnectorDefinitionId: string;
};
