// This file is auto-generated. Do not edit manually.
// Source: aws-mediapackage-asset.json

/** Resource schema for AWS::MediaPackage::Asset */
export type AwsMediapackageAsset = {
  /** The ARN of the Asset. */
  Arn?: string;
  /** The time the Asset was initially submitted for Ingest. */
  CreatedAt?: string;
  /** The list of egress endpoints available for the Asset. */
  EgressEndpoints?: {
    /** The ID of the PackagingConfiguration being applied to the Asset. */
    PackagingConfigurationId: string;
    /** The URL of the parent manifest for the repackaged Asset. */
    Url: string;
  }[];
  /** The unique identifier for the Asset. */
  Id: string;
  /** The ID of the PackagingGroup for the Asset. */
  PackagingGroupId: string;
  /** The resource ID to include in SPEKE key requests. */
  ResourceId?: string;
  /** ARN of the source object in S3. */
  SourceArn: string;
  /** The IAM role_arn used to access the source S3 bucket. */
  SourceRoleArn: string;
  /**
   * A collection of tags associated with a resource
   * @uniqueItems true
   */
  Tags?: {
    Key: string;
    Value: string;
  }[];
};
