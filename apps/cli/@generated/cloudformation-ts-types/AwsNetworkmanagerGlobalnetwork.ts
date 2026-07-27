// This file is auto-generated. Do not edit manually.
// Source: aws-networkmanager-globalnetwork.json

/** The AWS::NetworkManager::GlobalNetwork type specifies a global network of the user's account */
export type AwsNetworkmanagerGlobalnetwork = {
  /** The Amazon Resource Name (ARN) of the global network. */
  Arn?: string;
  /** The ID of the global network. */
  Id?: string;
  /** The description of the global network. */
  Description?: string;
  /**
   * The tags for the global network.
   * @uniqueItems true
   */
  Tags?: {
    /**
     * The key name of the tag. You can specify a value that is 1 to 128 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     */
    Key: string;
    /**
     * The value for the tag. You can specify a value that is 0 to 256 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     */
    Value: string;
  }[];
  /** The date and time that the global network was created. */
  CreatedAt?: string;
  /** The state of the global network. */
  State?: string;
};
