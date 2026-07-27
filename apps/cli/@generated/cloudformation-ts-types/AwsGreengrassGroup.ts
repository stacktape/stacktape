// This file is auto-generated. Do not edit manually.
// Source: aws-greengrass-group.json

/** Resource Type definition for AWS::Greengrass::Group */
export type AwsGreengrassGroup = {
  RoleAttachedAt?: string;
  LatestVersionArn?: string;
  Id?: string;
  Arn?: string;
  RoleArn?: string;
  Name: string;
  InitialVersion?: {
    LoggerDefinitionVersionArn?: string;
    DeviceDefinitionVersionArn?: string;
    FunctionDefinitionVersionArn?: string;
    CoreDefinitionVersionArn?: string;
    ResourceDefinitionVersionArn?: string;
    ConnectorDefinitionVersionArn?: string;
    SubscriptionDefinitionVersionArn?: string;
  };
  Tags?: Record<string, unknown>;
};
