// This file is auto-generated. Do not edit manually.
// Source: aws-mediastore-container.json

/** Resource Type definition for AWS::MediaStore::Container */
export type AwsMediastoreContainer = {
  Policy?: string;
  MetricPolicy?: {
    ContainerLevelMetrics: string;
    /** @uniqueItems false */
    MetricPolicyRules?: {
      ObjectGroupName: string;
      ObjectGroup: string;
    }[];
  };
  Endpoint?: string;
  ContainerName: string;
  /** @uniqueItems false */
  CorsPolicy?: {
    /** @uniqueItems false */
    AllowedMethods?: string[];
    /** @uniqueItems false */
    AllowedOrigins?: string[];
    /** @uniqueItems false */
    ExposeHeaders?: string[];
    MaxAgeSeconds?: number;
    /** @uniqueItems false */
    AllowedHeaders?: string[];
  }[];
  LifecyclePolicy?: string;
  AccessLoggingEnabled?: boolean;
  Id?: string;
  /** @uniqueItems false */
  Tags?: {
    Value: string;
    Key: string;
  }[];
};
