// This file is auto-generated. Do not edit manually.
// Source: aws-ec2-vpcblockpublicaccessoptions.json

/** Resource Type definition for AWS::EC2::VPCBlockPublicAccessOptions */
export type AwsEc2Vpcblockpublicaccessoptions = {
  /**
   * The desired Block Public Access mode for Internet Gateways in your account. We do not allow to
   * create in a off mode as this is the default value
   * @enum ["block-bidirectional","block-ingress"]
   */
  InternetGatewayBlockMode: "block-bidirectional" | "block-ingress";
  /** The identifier for the specified AWS account. */
  AccountId?: string;
  /**
   * Determines if exclusions are allowed. If you have enabled VPC BPA at the Organization level,
   * exclusions may be not-allowed. Otherwise, they are allowed.
   */
  ExclusionsAllowed?: string;
};
