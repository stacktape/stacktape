// This file is auto-generated. Do not edit manually.
// Source: aws-s3vectors-index.json

/** Resource Type definition for AWS::S3Vectors::Index */
export type AwsS3vectorsIndex = {
  CreationTime?: string;
  DataType: "float32";
  Dimension: number;
  DistanceMetric: "cosine" | "euclidean";
  IndexArn?: string;
  IndexName?: string;
  MetadataConfiguration?: {
    /**
     * Non-filterable metadata keys allow you to enrich vectors with additional context during storage and
     * retrieval. Unlike default metadata keys, these keys cannot be used as query filters. Non-filterable
     * metadata keys can be retrieved but cannot be searched, queried, or filtered. You can access
     * non-filterable metadata keys of your vectors after finding the vectors.
     * @minItems 1
     * @maxItems 10
     * @uniqueItems true
     */
    NonFilterableMetadataKeys?: string[];
  };
  VectorBucketArn?: string;
  VectorBucketName?: string;
};
