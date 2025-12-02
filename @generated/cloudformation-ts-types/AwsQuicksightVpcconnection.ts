// This file is auto-generated. Do not edit manually.
// Source: aws-quicksight-vpcconnection.json

/** Definition of the AWS::QuickSight::VPCConnection Resource Type. */
export type AwsQuicksightVpcconnection = {
  /** <p>The Amazon Resource Name (ARN) of the VPC connection.</p> */
  Arn?: string;
  AvailabilityStatus?: "AVAILABLE" | "UNAVAILABLE" | "PARTIALLY_AVAILABLE";
  /**
   * @minLength 12
   * @maxLength 12
   * @pattern ^[0-9]{12}$
   */
  AwsAccountId?: string;
  /** <p>The time that the VPC connection was created.</p> */
  CreatedTime?: string;
  DnsResolvers?: string[];
  /** <p>The time that the VPC connection was last updated.</p> */
  LastUpdatedTime?: string;
  /**
   * @minLength 1
   * @maxLength 128
   */
  Name?: string;
  /**
   * <p>A list of network interfaces.</p>
   * @minItems 0
   * @maxItems 15
   */
  NetworkInterfaces?: ({
    /**
     * <p>The subnet ID associated with the network interface.</p>
     * @minLength 1
     * @maxLength 255
     * @pattern ^subnet-[0-9a-z]*$
     */
    SubnetId?: string;
    /** <p>The availability zone that the network interface resides in.</p> */
    AvailabilityZone?: string;
    /** <p>An error message.</p> */
    ErrorMessage?: string;
    Status?: "CREATING" | "AVAILABLE" | "CREATION_FAILED" | "UPDATING" | "UPDATE_FAILED" | "DELETING" | "DELETED" | "DELETION_FAILED" | "DELETION_SCHEDULED" | "ATTACHMENT_FAILED_ROLLBACK_FAILED";
    /**
     * <p>The network interface ID.</p>
     * @minLength 0
     * @maxLength 255
     * @pattern ^eni-[0-9a-z]*$
     */
    NetworkInterfaceId?: string;
  })[];
  RoleArn?: string;
  /**
   * @minItems 1
   * @maxItems 16
   */
  SecurityGroupIds?: string[];
  Status?: "CREATION_IN_PROGRESS" | "CREATION_SUCCESSFUL" | "CREATION_FAILED" | "UPDATE_IN_PROGRESS" | "UPDATE_SUCCESSFUL" | "UPDATE_FAILED" | "DELETION_IN_PROGRESS" | "DELETION_FAILED" | "DELETED";
  /**
   * @minItems 2
   * @maxItems 15
   */
  SubnetIds?: string[];
  /**
   * @minItems 1
   * @maxItems 200
   */
  Tags?: {
    /**
     * <p>Tag key.</p>
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * <p>Tag value.</p>
     * @minLength 1
     * @maxLength 256
     */
    Value: string;
  }[];
  /**
   * @minLength 1
   * @maxLength 1000
   * @pattern [\w\-]+
   */
  VPCConnectionId?: string;
  /** <p>The Amazon EC2 VPC ID associated with the VPC connection.</p> */
  VPCId?: string;
};
