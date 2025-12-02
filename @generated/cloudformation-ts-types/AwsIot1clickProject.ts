// This file is auto-generated. Do not edit manually.
// Source: aws-iot1click-project.json

/** Resource Type definition for AWS::IoT1Click::Project */
export type AwsIot1clickProject = {
  Id?: string;
  ProjectName?: string;
  Arn?: string;
  Description?: string;
  PlacementTemplate: {
    DeviceTemplates?: Record<string, unknown>;
    DefaultAttributes?: Record<string, unknown>;
  };
};
