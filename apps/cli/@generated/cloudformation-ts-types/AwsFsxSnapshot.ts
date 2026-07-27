// This file is auto-generated. Do not edit manually.
// Source: aws-fsx-snapshot.json

/** Resource Type definition for AWS::FSx::Snapshot */
export type AwsFsxSnapshot = {
  ResourceARN?: string;
  VolumeId: string;
  Id?: string;
  /** @uniqueItems false */
  Tags?: {
    Value: string;
    Key: string;
  }[];
  Name: string;
};
