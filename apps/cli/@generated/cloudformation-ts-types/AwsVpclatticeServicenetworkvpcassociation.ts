// This file is auto-generated. Do not edit manually.
// Source: aws-vpclattice-servicenetworkvpcassociation.json

/** Associates a VPC with a service network. */
export type AwsVpclatticeServicenetworkvpcassociation = {
  /**
   * @minLength 20
   * @maxLength 2048
   * @pattern ^arn:[a-z0-9\-]+:vpc-lattice:[a-zA-Z0-9\-]+:\d{12}:servicenetworkvpcassociation/snva-[0-9a-z]{17}$
   */
  Arn?: string;
  CreatedAt?: string;
  /** @uniqueItems true */
  SecurityGroupIds?: string[];
  /**
   * @minLength 22
   * @maxLength 22
   * @pattern ^snva-[0-9a-z]{17}$
   */
  Id?: string;
  /**
   * @minLength 20
   * @maxLength 2048
   * @pattern ^arn:[a-z0-9\-]+:vpc-lattice:[a-zA-Z0-9\-]+:\d{12}:servicenetwork/sn-[0-9a-z]{17}$
   */
  ServiceNetworkArn?: string;
  /**
   * @minLength 20
   * @maxLength 20
   * @pattern ^sn-[0-9a-z]{17}$
   */
  ServiceNetworkId?: string;
  /**
   * @minLength 20
   * @maxLength 2048
   * @pattern ^((sn-[0-9a-z]{17})|(arn:[a-z0-9\-]+:vpc-lattice:[a-zA-Z0-9\-]+:\d{12}:servicenetwork/sn-[0-9a-z]{17}))$
   */
  ServiceNetworkIdentifier?: string;
  /**
   * @minLength 3
   * @maxLength 63
   * @pattern ^(?!servicenetwork-)(?![-])(?!.*[-]$)(?!.*[-]{2})[a-z0-9-]+$
   */
  ServiceNetworkName?: string;
  /** @enum ["CREATE_IN_PROGRESS","ACTIVE","UPDATE_IN_PROGRESS","DELETE_IN_PROGRESS","CREATE_FAILED","DELETE_FAILED"] */
  Status?: "CREATE_IN_PROGRESS" | "ACTIVE" | "UPDATE_IN_PROGRESS" | "DELETE_IN_PROGRESS" | "CREATE_FAILED" | "DELETE_FAILED";
  /**
   * @minLength 5
   * @maxLength 2048
   * @pattern ^vpc-(([0-9a-z]{8})|([0-9a-z]{17}))$
   */
  VpcId?: string;
  /**
   * @minLength 5
   * @maxLength 2048
   * @pattern ^vpc-(([0-9a-z]{8})|([0-9a-z]{17}))$
   */
  VpcIdentifier?: string;
  /**
   * @minItems 0
   * @maxItems 50
   * @uniqueItems true
   */
  Tags?: {
    /**
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * @minLength 1
     * @maxLength 256
     */
    Value: string;
  }[];
  PrivateDnsEnabled?: boolean;
  DnsOptions?: {
    /** @enum ["VERIFIED_DOMAINS_ONLY","ALL_DOMAINS","VERIFIED_DOMAINS_AND_SPECIFIED_DOMAINS","SPECIFIED_DOMAINS_ONLY"] */
    PrivateDnsPreference?: "VERIFIED_DOMAINS_ONLY" | "ALL_DOMAINS" | "VERIFIED_DOMAINS_AND_SPECIFIED_DOMAINS" | "SPECIFIED_DOMAINS_ONLY";
    /**
     * @minItems 1
     * @maxItems 10
     * @uniqueItems true
     */
    PrivateDnsSpecifiedDomains?: string[];
  };
};
