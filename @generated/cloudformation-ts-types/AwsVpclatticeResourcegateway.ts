// This file is auto-generated. Do not edit manually.
// Source: aws-vpclattice-resourcegateway.json

/** Creates a resource gateway for a service. */
export type AwsVpclatticeResourcegateway = {
  /** @enum ["IPV4","IPV6","DUALSTACK"] */
  IpAddressType?: "IPV4" | "IPV6" | "DUALSTACK";
  /**
   * @minLength 5
   * @maxLength 50
   */
  VpcIdentifier: string;
  /** The number of IPv4 addresses to allocate per ENI for the resource gateway */
  Ipv4AddressesPerEni?: number;
  /**
   * @minLength 17
   * @maxLength 2048
   * @pattern ^((rgw-[0-9a-z]{17})|(arn:[a-z0-9\-]+:vpc-lattice:[a-zA-Z0-9\-]+:\d{12}:resourcegateway/rgw-[0-9a-z]{17}))$
   */
  Id?: string;
  /**
   * @minLength 20
   * @maxLength 2048
   * @pattern ^arn:[a-z0-9\-]+:vpc-lattice:[a-zA-Z0-9\-]+:\d{12}:resourcegateway/rgw-[0-9a-z]{17}$
   */
  Arn?: string;
  /**
   * The ID of one or more subnets in which to create an endpoint network interface.
   * @uniqueItems true
   */
  SubnetIds: string[];
  /**
   * The ID of one or more security groups to associate with the endpoint network interface.
   * @uniqueItems true
   */
  SecurityGroupIds?: (unknown | unknown | unknown)[];
  /**
   * @minItems 0
   * @maxItems 50
   * @uniqueItems true
   */
  Tags?: {
    /**
     * @minLength 1
     * @maxLength 256
     */
    Value?: string;
    /**
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
  }[];
  /**
   * @minLength 3
   * @maxLength 40
   * @pattern ^(?!rgw-)(?![-])(?!.*[-]$)(?!.*[-]{2})[a-z0-9-]+$
   */
  Name: string;
};
