// This file is auto-generated. Do not edit manually.
// Source: aws-mediaconnect-routernetworkinterface.json

/**
 * Represents a router network interface in AWS Elemental MediaConnect that is used to define a
 * network boundary for router resources
 */
export type AwsMediaconnectRouternetworkinterface = {
  /** @pattern ^arn:(aws[a-zA-Z-]*):mediaconnect:[a-z0-9-]+:[0-9]{12}:routerNetworkInterface:[a-z0-9]{12}$ */
  Arn?: string;
  /** The number of router inputs associated with the network interface. */
  AssociatedInputCount?: number;
  /** The number of router outputs associated with the network interface. */
  AssociatedOutputCount?: number;
  Configuration: {
    Public: {
      /**
       * The list of allowed CIDR blocks for the public router network interface.
       * @minItems 0
       * @maxItems 10
       */
      AllowRules: {
        /** The CIDR block that is allowed to access the public router network interface. */
        Cidr: string;
      }[];
    };
  } | {
    Vpc: {
      /**
       * The IDs of the security groups to associate with the router network interface within the VPC.
       * @minItems 1
       * @maxItems 5
       */
      SecurityGroupIds: string[];
      /** The ID of the subnet within the VPC to associate the router network interface with. */
      SubnetId: string;
    };
  };
  /** The timestamp when the router network interface was created. */
  CreatedAt?: string;
  /** The unique identifier of the router network interface. */
  Id?: string;
  /**
   * The name of the router network interface.
   * @minLength 1
   * @maxLength 128
   */
  Name: string;
  NetworkInterfaceType?: "PUBLIC" | "VPC";
  /** The AWS Region for the router network interface. Defaults to the current region if not specified. */
  RegionName?: string;
  State?: "CREATING" | "ACTIVE" | "UPDATING" | "DELETING" | "ERROR" | "RECOVERING";
  /** Key-value pairs that can be used to tag and organize this router network interface. */
  Tags?: {
    Key: string;
    Value: string;
  }[];
  /** The timestamp when the router network interface was last updated. */
  UpdatedAt?: string;
};
