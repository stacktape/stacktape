// This file is auto-generated. Do not edit manually.
// Source: aws-vpclattice-servicenetworkresourceassociation.json

/** VpcLattice ServiceNetworkResourceAssociation CFN resource */
export type AwsVpclatticeServicenetworkresourceassociation = {
  /**
   * @minLength 22
   * @maxLength 22
   * @pattern ^snra-[0-9a-f]{17}$
   */
  Id?: string;
  /**
   * @minLength 22
   * @maxLength 2048
   * @pattern ^arn:[a-z0-9\-]+:vpc-lattice:[a-zA-Z0-9\-]+:\d{12}:servicenetworkresourceassociation/snra-[0-9a-f]{17}$
   */
  Arn?: string;
  /**
   * @minLength 17
   * @maxLength 2048
   * @pattern ^rcfg-[0-9a-z]{17}$
   */
  ResourceConfigurationId?: string;
  /**
   * @minLength 3
   * @maxLength 2048
   * @pattern ^((sn-[0-9a-z]{17})|(arn:[a-z0-9\-]+:vpc-lattice:[a-zA-Z0-9\-]+:\d{12}:servicenetwork/sn-[0-9a-z]{17}))$
   */
  ServiceNetworkId?: string;
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
};
