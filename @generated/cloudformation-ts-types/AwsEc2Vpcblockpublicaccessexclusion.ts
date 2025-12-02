// This file is auto-generated. Do not edit manually.
// Source: aws-ec2-vpcblockpublicaccessexclusion.json

/** Resource Type definition for AWS::EC2::VPCBlockPublicAccessExclusion. */
export type AwsEc2Vpcblockpublicaccessexclusion = {
  /** The ID of the exclusion */
  ExclusionId?: string;
  /**
   * The desired Block Public Access Exclusion Mode for a specific VPC/Subnet.
   * @enum ["allow-bidirectional","allow-egress"]
   */
  InternetGatewayExclusionMode: "allow-bidirectional" | "allow-egress";
  /** The ID of the vpc. Required only if you don't specify SubnetId. */
  VpcId?: string;
  /** The ID of the subnet. Required only if you don't specify VpcId */
  SubnetId?: string;
  /**
   * An array of key-value pairs to apply to this resource.
   * @uniqueItems false
   */
  Tags?: {
    /**
     * The key name of the tag. You can specify a value that is 1 to 128 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * The value for the tag. You can specify a value that is 0 to 256 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
};
