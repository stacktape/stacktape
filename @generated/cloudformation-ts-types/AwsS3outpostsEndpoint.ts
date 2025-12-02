// This file is auto-generated. Do not edit manually.
// Source: aws-s3outposts-endpoint.json

/** Resource Type Definition for AWS::S3Outposts::Endpoint */
export type AwsS3outpostsEndpoint = {
  /**
   * The Amazon Resource Name (ARN) of the endpoint.
   * @minLength 5
   * @maxLength 500
   * @pattern ^arn:[^:]+:s3-outposts:[a-zA-Z0-9\-]+:\d{12}:outpost\/[^:]+\/endpoint/[a-zA-Z0-9]{19}$
   */
  Arn?: string;
  /**
   * The VPC CIDR committed by this endpoint.
   * @minLength 1
   * @maxLength 20
   */
  CidrBlock?: string;
  /** The time the endpoint was created. */
  CreationTime?: string;
  /**
   * The ID of the endpoint.
   * @minLength 5
   * @maxLength 500
   * @pattern ^[a-zA-Z0-9]{19}$
   */
  Id?: string;
  /**
   * The network interfaces of the endpoint.
   * @uniqueItems true
   */
  NetworkInterfaces?: {
    /**
     * @minLength 1
     * @maxLength 100
     */
    NetworkInterfaceId: string;
  }[];
  /**
   * The id of the customer outpost on which the bucket resides.
   * @pattern ^(op-[a-f0-9]{17}|\d{12}|ec2)$
   */
  OutpostId: string;
  /**
   * The ID of the security group to use with the endpoint.
   * @minLength 1
   * @maxLength 100
   * @pattern ^sg-([0-9a-f]{8}|[0-9a-f]{17})$
   */
  SecurityGroupId: string;
  /** @enum ["Available","Pending","Deleting","Create_Failed","Delete_Failed"] */
  Status?: "Available" | "Pending" | "Deleting" | "Create_Failed" | "Delete_Failed";
  /**
   * The ID of the subnet in the selected VPC. The subnet must belong to the Outpost.
   * @minLength 1
   * @maxLength 100
   * @pattern ^subnet-([0-9a-f]{8}|[0-9a-f]{17})$
   */
  SubnetId: string;
  /**
   * The type of access for the on-premise network connectivity for the Outpost endpoint. To access
   * endpoint from an on-premises network, you must specify the access type and provide the customer
   * owned Ipv4 pool.
   * @default "Private"
   * @enum ["CustomerOwnedIp","Private"]
   */
  AccessType?: "CustomerOwnedIp" | "Private";
  /**
   * The ID of the customer-owned IPv4 pool for the Endpoint. IP addresses will be allocated from this
   * pool for the endpoint.
   * @pattern ^ipv4pool-coip-([0-9a-f]{17})$
   */
  CustomerOwnedIpv4Pool?: string;
  /** The failure reason, if any, for a create or delete endpoint operation. */
  FailedReason?: {
    /** The failure code, if any, for a create or delete endpoint operation. */
    ErrorCode?: string;
    /** Additional error details describing the endpoint failure and recommended action. */
    Message?: string;
  };
};
