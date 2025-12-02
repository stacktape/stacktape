// This file is auto-generated. Do not edit manually.
// Source: aws-config-deliverychannel.json

/** Resource Type definition for AWS::Config::DeliveryChannel */
export type AwsConfigDeliverychannel = {
  S3KeyPrefix?: string;
  ConfigSnapshotDeliveryProperties?: {
    DeliveryFrequency?: string;
  };
  S3BucketName: string;
  SnsTopicARN?: string;
  Id?: string;
  S3KmsKeyArn?: string;
  Name?: string;
};
