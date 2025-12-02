// This file is auto-generated. Do not edit manually.
// Source: aws-msk-configuration.json

/** Resource Type definition for AWS::MSK::Configuration */
export type AwsMskConfiguration = {
  Name: string;
  Description?: string;
  ServerProperties: string;
  KafkaVersionsList?: string[];
  Arn?: string;
  LatestRevision?: {
    CreationTime?: string;
    Description?: string;
    Revision?: number;
  };
};
