// This file is auto-generated. Do not edit manually.
// Source: aws-batch-serviceenvironment.json

/** Resource Type definition for AWS::Batch::ServiceEnvironment */
export type AwsBatchServiceenvironment = {
  ServiceEnvironmentArn?: string;
  ServiceEnvironmentName?: string;
  State?: string;
  ServiceEnvironmentType: string;
  CapacityLimits: {
    MaxCapacity?: number;
    CapacityUnit?: string;
  }[];
  /** A key-value pair to associate with a resource. */
  Tags?: Record<string, string>;
};
