// This file is auto-generated. Do not edit manually.
// Source: aws-appsync-apicache.json

/** Resource Type definition for AWS::AppSync::ApiCache */
export type AwsAppsyncApicache = {
  Type: string;
  TransitEncryptionEnabled?: boolean;
  HealthMetricsConfig?: string;
  AtRestEncryptionEnabled?: boolean;
  Id?: string;
  ApiId: string;
  ApiCachingBehavior: string;
  Ttl: number;
};
