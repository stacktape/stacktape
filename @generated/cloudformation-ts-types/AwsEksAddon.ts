// This file is auto-generated. Do not edit manually.
// Source: aws-eks-addon.json

/** Resource Schema for AWS::EKS::Addon */
export type AwsEksAddon = {
  /**
   * Name of Cluster
   * @minLength 1
   */
  ClusterName: string;
  /**
   * Name of Addon
   * @minLength 1
   */
  AddonName: string;
  /**
   * Version of Addon
   * @minLength 1
   */
  AddonVersion?: string;
  /** PreserveOnDelete parameter value */
  PreserveOnDelete?: boolean;
  /**
   * Resolve parameter value conflicts
   * @minLength 1
   * @enum ["NONE","OVERWRITE","PRESERVE"]
   */
  ResolveConflicts?: "NONE" | "OVERWRITE" | "PRESERVE";
  /**
   * IAM role to bind to the add-on's service account
   * @minLength 1
   */
  ServiceAccountRoleArn?: string;
  /**
   * An array of pod identities to apply to this add-on.
   * @uniqueItems true
   */
  PodIdentityAssociations?: {
    /** The Kubernetes service account that the pod identity association is created for. */
    ServiceAccount: string;
    /**
     * The IAM role ARN that the pod identity association is created for.
     * @pattern ^arn:aws(-cn|-us-gov|-iso(-[a-z])?)?:iam::\d{12}:(role)\/*
     */
    RoleArn: string;
  }[];
  /**
   * The configuration values to use with the add-on
   * @minLength 1
   */
  ConfigurationValues?: string;
  /** Amazon Resource Name (ARN) of the add-on */
  Arn?: string;
  /** The custom namespace configuration to use with the add-on */
  NamespaceConfig?: {
    /** The custom namespace for creating the add-on */
    Namespace: string;
  };
  /**
   * An array of key-value pairs to apply to this resource.
   * @uniqueItems true
   */
  Tags?: {
    /**
     * The key name of the tag. You can specify a value that is 1 to 127 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 1
     * @maxLength 127
     */
    Key: string;
    /**
     * The value for the tag. You can specify a value that is 1 to 255 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 1
     * @maxLength 255
     */
    Value: string;
  }[];
};
