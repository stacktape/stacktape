// This file is auto-generated. Do not edit manually.
// Source: aws-eks-accessentry.json

/** An object representing an Amazon EKS AccessEntry. */
export type AwsEksAccessentry = {
  /**
   * The cluster that the access entry is created for.
   * @minLength 1
   */
  ClusterName: string;
  /**
   * The principal ARN that the access entry is created for.
   * @minLength 1
   */
  PrincipalArn: string;
  /** The Kubernetes user that the access entry is associated with. */
  Username?: string;
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
  /** The ARN of the access entry. */
  AccessEntryArn?: string;
  /**
   * The Kubernetes groups that the access entry is associated with.
   * @uniqueItems true
   */
  KubernetesGroups?: string[];
  /**
   * An array of access policies that are associated with the access entry.
   * @maxItems 20
   * @uniqueItems true
   */
  AccessPolicies?: ({
    /** The ARN of the access policy to add to the access entry. */
    PolicyArn: string;
    AccessScope: {
      /**
       * The type of the access scope.
       * @enum ["namespace","cluster"]
       */
      Type: "namespace" | "cluster";
      /**
       * The namespaces to associate with the access scope. Only specify if Type is set to 'namespace'.
       * @uniqueItems true
       */
      Namespaces?: string[];
    };
  })[];
  /** The node type to associate with the access entry. */
  Type?: string;
};
