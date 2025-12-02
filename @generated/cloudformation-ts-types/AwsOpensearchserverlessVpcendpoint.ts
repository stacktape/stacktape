// This file is auto-generated. Do not edit manually.
// Source: aws-opensearchserverless-vpcendpoint.json

/** Amazon OpenSearchServerless vpc endpoint resource */
export type AwsOpensearchserverlessVpcendpoint = {
  /**
   * The identifier of the VPC Endpoint
   * @minLength 1
   * @maxLength 255
   * @pattern ^vpce-[0-9a-z]*$
   */
  Id?: string;
  /**
   * The name of the VPC Endpoint
   * @minLength 3
   * @maxLength 32
   * @pattern ^[a-z][a-z0-9-]{2,31}$
   */
  Name: string;
  /**
   * The ID of one or more security groups to associate with the endpoint network interface
   * @minItems 1
   * @maxItems 5
   */
  SecurityGroupIds?: string[];
  /**
   * The ID of one or more subnets in which to create an endpoint network interface
   * @minItems 1
   * @maxItems 6
   */
  SubnetIds: string[];
  /**
   * The ID of the VPC in which the endpoint will be used.
   * @minLength 1
   * @maxLength 255
   * @pattern ^vpc-[0-9a-z]*$
   */
  VpcId: string;
};
