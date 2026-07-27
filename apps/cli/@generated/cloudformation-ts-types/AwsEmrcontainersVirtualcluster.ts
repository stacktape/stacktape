// This file is auto-generated. Do not edit manually.
// Source: aws-emrcontainers-virtualcluster.json

/** Resource Schema of AWS::EMRContainers::VirtualCluster Type */
export type AwsEmrcontainersVirtualcluster = {
  Arn?: string;
  /** Container provider of the virtual cluster. */
  ContainerProvider: {
    /** The type of the container provider */
    Type: string;
    /**
     * The ID of the container cluster
     * @minLength 1
     * @maxLength 100
     * @pattern ^[0-9A-Za-z][A-Za-z0-9\-_]*
     */
    Id: string;
    Info: {
      EksInfo: {
        /**
         * @minLength 1
         * @maxLength 63
         * @pattern [a-z0-9]([-a-z0-9]*[a-z0-9])?
         */
        Namespace: string;
      };
    };
  };
  /**
   * Id of the virtual cluster.
   * @minLength 1
   * @maxLength 64
   */
  Id?: string;
  /**
   * Name of the virtual cluster.
   * @minLength 1
   * @maxLength 64
   * @pattern [\.\-_/#A-Za-z0-9]+
   */
  Name: string;
  /**
   * An array of key-value pairs to apply to this virtual cluster.
   * @uniqueItems true
   */
  Tags?: {
    /**
     * The key name of the tag. You can specify a value that is 1 to 127 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     */
    Key: string;
    /**
     * The value for the tag. You can specify a value that is 1 to 255 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     */
    Value: string;
  }[];
  /**
   * The ID of the security configuration.
   * @minLength 1
   * @maxLength 64
   * @pattern [0-9a-z]+
   */
  SecurityConfigurationId?: string;
};
