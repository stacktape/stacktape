// This file is auto-generated. Do not edit manually.
// Source: aws-securityhub-hubv2.json

/**
 * The AWS::SecurityHub::HubV2 resource represents the implementation of the AWS Security Hub V2
 * service in your account. Only one hubv2 resource can created in each region in which you enable
 * Security Hub V2.
 */
export type AwsSecurityhubHubv2 = {
  /**
   * The Amazon Resource Name of the Security Hub V2 resource.
   * @pattern arn:aws(?:-[a-z]+)*:securityhub:[a-z0-9-]+:\d{12}:hubv2/[^/](.{0,1022}[^/:])?$
   */
  HubV2Arn?: string;
  SubscribedAt?: string;
  Tags?: Record<string, string>;
};
