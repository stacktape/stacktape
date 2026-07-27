// This file is auto-generated. Do not edit manually.
// Source: aws-ec2-instanceconnectendpoint.json

/** Resource Type definition for AWS::EC2::InstanceConnectEndpoint */
export type AwsEc2Instanceconnectendpoint = {
  /** The id of the instance connect endpoint */
  Id?: string;
  /** The subnet id of the instance connect endpoint */
  SubnetId: string;
  /** The client token of the instance connect endpoint. */
  ClientToken?: string;
  /**
   * If true, the address of the instance connect endpoint client is preserved when connecting to the
   * end resource
   */
  PreserveClientIp?: boolean;
  /**
   * The tags of the instance connect endpoint.
   * @uniqueItems false
   */
  Tags?: {
    Key: string;
    Value: string;
  }[];
  /**
   * The security group IDs of the instance connect endpoint.
   * @uniqueItems true
   */
  SecurityGroupIds?: string[];
};
