// This file is auto-generated. Do not edit manually.
// Source: aws-redshift-endpointaccess.json

/** Resource schema for a Redshift-managed VPC endpoint. */
export type AwsRedshiftEndpointaccess = {
  /** The status of the endpoint. */
  EndpointStatus?: string;
  /** The connection endpoint for connecting to an Amazon Redshift cluster through the proxy. */
  VpcEndpoint?: {
    /** The VPC identifier that the endpoint is associated. */
    VpcId?: string;
    /** One or more network interfaces of the endpoint. Also known as an interface endpoint. */
    NetworkInterfaces?: {
      /** The IPv4 address of the network interface within the subnet. */
      PrivateIpAddress?: string;
      /** The Availability Zone. */
      AvailabilityZone?: string;
      /** The subnet identifier. */
      SubnetId?: string;
      /** The network interface identifier. */
      NetworkInterfaceId?: string;
    }[];
    /** The connection endpoint ID for connecting an Amazon Redshift cluster through the proxy. */
    VpcEndpointId?: string;
  };
  /** The DNS address of the endpoint. */
  Address?: string;
  /**
   * The name of the endpoint.
   * @pattern ^(?=^[a-z][a-z0-9]*(-[a-z0-9]+)*$).{1,30}$
   */
  EndpointName: string;
  /** A list of vpc security group ids to apply to the created endpoint access. */
  VpcSecurityGroupIds: string[];
  /**
   * The AWS account ID of the owner of the cluster.
   * @pattern ^\d{12}$
   */
  ResourceOwner?: string;
  /**
   * The subnet group name where Amazon Redshift chooses to deploy the endpoint.
   * @pattern ^(?=^[a-zA-Z0-9-]+$).{1,255}$
   */
  SubnetGroupName: string;
  /** The port number on which the cluster accepts incoming connections. */
  Port?: number;
  /** The time (UTC) that the endpoint was created. */
  EndpointCreateTime?: string;
  /**
   * A unique identifier for the cluster. You use this identifier to refer to the cluster for any
   * subsequent cluster operations such as deleting or modifying. All alphabetical characters must be
   * lower case, no hypens at the end, no two consecutive hyphens. Cluster name should be unique for all
   * clusters within an AWS account
   */
  ClusterIdentifier: string;
  /** A list of Virtual Private Cloud (VPC) security groups to be associated with the endpoint. */
  VpcSecurityGroups?: {
    /** The status of the VPC security group. */
    Status?: string;
    /** The identifier of the VPC security group. */
    VpcSecurityGroupId?: string;
  }[];
};
