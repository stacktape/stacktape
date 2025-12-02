// This file is auto-generated. Do not edit manually.
// Source: aws-eks-podidentityassociation.json

/** An object representing an Amazon EKS PodIdentityAssociation. */
export type AwsEksPodidentityassociation = {
  /**
   * The cluster that the pod identity association is created for.
   * @minLength 1
   */
  ClusterName: string;
  /** The IAM role ARN that the pod identity association is created for. */
  RoleArn: string;
  /** The Kubernetes namespace that the pod identity association is created for. */
  Namespace: string;
  /** The Kubernetes service account that the pod identity association is created for. */
  ServiceAccount: string;
  /** The ARN of the pod identity association. */
  AssociationArn?: string;
  /**
   * The ID of the pod identity association.
   * @minLength 1
   */
  AssociationId?: string;
  /**
   * The Target Role Arn of the pod identity association.
   * @minLength 1
   */
  TargetRoleArn?: string;
  /**
   * The External Id of the pod identity association.
   * @minLength 1
   */
  ExternalId?: string;
  /**
   * The Disable Session Tags of the pod identity association.
   * @minLength 1
   */
  DisableSessionTags?: boolean;
  /**
   * An array of key-value pairs to apply to this resource.
   * @uniqueItems true
   */
  Tags?: {
    /**
     * The key name of the tag. You can specify a value that is 1 to 128 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * The value for the tag. You can specify a value that is 0 to 256 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
};
