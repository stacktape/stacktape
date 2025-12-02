// This file is auto-generated. Do not edit manually.
// Source: aws-ecr-pullthroughcacherule.json

/**
 * The ``AWS::ECR::PullThroughCacheRule`` resource creates or updates a pull through cache rule. A
 * pull through cache rule provides a way to cache images from an upstream registry in your Amazon ECR
 * private registry.
 */
export type AwsEcrPullthroughcacherule = {
  /** The Amazon ECR repository prefix associated with the pull through cache rule. */
  EcrRepositoryPrefix?: string;
  /** The upstream registry URL associated with the pull through cache rule. */
  UpstreamRegistryUrl?: string;
  /** The ARN of the Secrets Manager secret associated with the pull through cache rule. */
  CredentialArn?: string;
  /** The name of the upstream source registry associated with the pull through cache rule. */
  UpstreamRegistry?: string;
  /** The ARN of the IAM role associated with the pull through cache rule. */
  CustomRoleArn?: string;
  /** The upstream repository prefix associated with the pull through cache rule. */
  UpstreamRepositoryPrefix?: string;
};
