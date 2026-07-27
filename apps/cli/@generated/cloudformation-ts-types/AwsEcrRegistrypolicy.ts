// This file is auto-generated. Do not edit manually.
// Source: aws-ecr-registrypolicy.json

/**
 * The ``AWS::ECR::RegistryPolicy`` resource creates or updates the permissions policy for a private
 * registry.
 * A private registry policy is used to specify permissions for another AWS-account and is used when
 * configuring cross-account replication. For more information, see [Registry
 * permissions](https://docs.aws.amazon.com/AmazonECR/latest/userguide/registry-permissions.html) in
 * the *Amazon Elastic Container Registry User Guide*.
 */
export type AwsEcrRegistrypolicy = {
  RegistryId?: string;
  /** The JSON policy text for your registry. */
  PolicyText: Record<string, unknown>;
};
