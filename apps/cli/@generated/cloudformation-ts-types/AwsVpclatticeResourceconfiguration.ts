// This file is auto-generated. Do not edit manually.
// Source: aws-vpclattice-resourceconfiguration.json

/** VpcLattice ResourceConfiguration CFN resource */
export type AwsVpclatticeResourceconfiguration = {
  /**
   * @minLength 3
   * @maxLength 255
   */
  CustomDomainName?: string;
  PortRanges?: string[];
  ResourceConfigurationDefinition?: {
    IpResource: string;
  } | {
    ArnResource: string;
  } | {
    DnsResource: {
      /** @enum ["IPV4","IPV6","DUALSTACK"] */
      IpAddressType: "IPV4" | "IPV6" | "DUALSTACK";
      /**
       * @minLength 3
       * @maxLength 255
       */
      DomainName: string;
    };
  };
  /**
   * @minLength 3
   * @maxLength 255
   */
  GroupDomain?: string;
  /** @enum ["NONE","AWS_IAM"] */
  ResourceConfigurationAuthType?: "NONE" | "AWS_IAM";
  ResourceConfigurationGroupId?: string;
  /**
   * @minLength 3
   * @maxLength 40
   * @pattern ^(?!rcfg-)(?![-])(?!.*[-]$)(?!.*[-]{2})[a-z0-9-]+$
   */
  Name: string;
  AllowAssociationToSharableServiceNetwork?: boolean;
  /** @enum ["TCP"] */
  ProtocolType?: "TCP";
  /** @enum ["GROUP","CHILD","SINGLE","ARN"] */
  ResourceConfigurationType: "GROUP" | "CHILD" | "SINGLE" | "ARN";
  /**
   * @minLength 20
   * @maxLength 20
   * @pattern ^dv-[a-fA-F0-9]{17}$
   */
  DomainVerificationId?: string;
  Id?: string;
  ResourceGatewayId?: string;
  /**
   * @minLength 20
   * @maxLength 2048
   * @pattern ^arn:[a-z0-9f\-]+:vpc-lattice:[a-zA-Z0-9\-]+:\d{12}:resourceconfiguration/rcfg-[0-9a-z]{17}$
   */
  Arn?: string;
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
};
