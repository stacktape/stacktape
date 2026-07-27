// This file is auto-generated. Do not edit manually.
// Source: aws-apprunner-vpcconnector.json

/** The AWS::AppRunner::VpcConnector resource specifies an App Runner VpcConnector. */
export type AwsApprunnerVpcconnector = {
  /**
   * A name for the VPC connector. If you don't specify a name, AWS CloudFormation generates a name for
   * your VPC connector.
   * @minLength 4
   * @maxLength 40
   * @pattern ^[A-Za-z0-9][A-Za-z0-9-\\_]{3,39}$
   */
  VpcConnectorName?: string;
  /**
   * The Amazon Resource Name (ARN) of this VPC connector.
   * @minLength 44
   * @maxLength 1011
   * @pattern arn:aws(-[\w]+)*:[a-z0-9-\\.]{0,63}:[a-z0-9-\\.]{0,63}:[0-9]{12}:(\w|\/|-){1,1011}
   */
  VpcConnectorArn?: string;
  /**
   * The revision of this VPC connector. It's unique among all the active connectors ("Status":
   * "ACTIVE") that share the same Name.
   */
  VpcConnectorRevision?: number;
  /**
   * A list of IDs of subnets that App Runner should use when it associates your service with a custom
   * Amazon VPC. Specify IDs of subnets of a single Amazon VPC. App Runner determines the Amazon VPC
   * from the subnets you specify.
   * @minItems 1
   * @uniqueItems true
   */
  Subnets: string[];
  /**
   * A list of IDs of security groups that App Runner should use for access to AWS resources under the
   * specified subnets. If not specified, App Runner uses the default security group of the Amazon VPC.
   * The default security group allows all outbound traffic.
   * @uniqueItems true
   */
  SecurityGroups?: string[];
  /**
   * A list of metadata items that you can associate with your VPC connector resource. A tag is a
   * key-value pair.
   */
  Tags?: {
    Key?: string;
    Value?: string;
  }[];
};
