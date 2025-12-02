// This file is auto-generated. Do not edit manually.
// Source: aws-mediapackage-packaginggroup.json

/** Resource schema for AWS::MediaPackage::PackagingGroup */
export type AwsMediapackagePackaginggroup = {
  /**
   * The ID of the PackagingGroup.
   * @minLength 1
   * @maxLength 256
   * @pattern \A[0-9a-zA-Z-_]+\Z
   */
  Id: string;
  /** The ARN of the PackagingGroup. */
  Arn?: string;
  /** The fully qualified domain name for Assets in the PackagingGroup. */
  DomainName?: string;
  /** CDN Authorization */
  Authorization?: {
    /**
     * The Amazon Resource Name (ARN) for the secret in AWS Secrets Manager that is used for CDN
     * authorization.
     */
    CdnIdentifierSecret: string;
    /**
     * The Amazon Resource Name (ARN) for the IAM role that allows MediaPackage to communicate with AWS
     * Secrets Manager.
     */
    SecretsRoleArn: string;
  };
  /**
   * A collection of tags associated with a resource
   * @uniqueItems true
   */
  Tags?: {
    Key: string;
    Value: string;
  }[];
  /** The configuration parameters for egress access logging. */
  EgressAccessLogs?: {
    /**
     * Sets a custom AWS CloudWatch log group name for egress logs. If a log group name isn't specified,
     * the default name is used: /aws/MediaPackage/VodEgressAccessLogs.
     * @minLength 1
     * @maxLength 512
     * @pattern \A\/aws\/MediaPackage\/[0-9a-zA-Z-_\/\.#]+\Z
     */
    LogGroupName?: string;
  };
};
