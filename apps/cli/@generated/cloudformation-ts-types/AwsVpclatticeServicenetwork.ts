// This file is auto-generated. Do not edit manually.
// Source: aws-vpclattice-servicenetwork.json

/**
 * A service network is a logical boundary for a collection of services. You can associate services
 * and VPCs with a service network.
 */
export type AwsVpclatticeServicenetwork = {
  /**
   * @minLength 20
   * @maxLength 2048
   * @pattern ^arn:[a-z0-9\-]+:vpc-lattice:[a-zA-Z0-9\-]+:\d{12}:servicenetwork/sn-[0-9a-z]{17}$
   */
  Arn?: string;
  CreatedAt?: string;
  /**
   * @minLength 20
   * @maxLength 20
   * @pattern ^sn-[0-9a-z]{17}$
   */
  Id?: string;
  LastUpdatedAt?: string;
  /**
   * @minLength 3
   * @maxLength 63
   * @pattern ^(?!servicenetwork-)(?![-])(?!.*[-]$)(?!.*[-]{2})[a-z0-9-]+$
   */
  Name?: string;
  /**
   * @default "NONE"
   * @enum ["NONE","AWS_IAM"]
   */
  AuthType?: "NONE" | "AWS_IAM";
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
  SharingConfig?: {
    enabled: boolean;
  };
};
