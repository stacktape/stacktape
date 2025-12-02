// This file is auto-generated. Do not edit manually.
// Source: aws-shield-drtaccess.json

/**
 * Config the role and list of Amazon S3 log buckets used by the Shield Response Team (SRT) to access
 * your AWS account while assisting with attack mitigation.
 */
export type AwsShieldDrtaccess = {
  AccountId?: string;
  /**
   * Authorizes the Shield Response Team (SRT) to access the specified Amazon S3 bucket containing log
   * data such as Application Load Balancer access logs, CloudFront logs, or logs from third party
   * sources. You can associate up to 10 Amazon S3 buckets with your subscription.
   * @minItems 0
   * @maxItems 10
   */
  LogBucketList?: string[];
  /**
   * Authorizes the Shield Response Team (SRT) using the specified role, to access your AWS account to
   * assist with DDoS attack mitigation during potential attacks. This enables the SRT to inspect your
   * AWS WAF configuration and create or update AWS WAF rules and web ACLs.
   * @maxLength 2048
   */
  RoleArn: string;
};
