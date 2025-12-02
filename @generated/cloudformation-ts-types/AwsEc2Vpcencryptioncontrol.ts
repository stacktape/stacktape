// This file is auto-generated. Do not edit manually.
// Source: aws-ec2-vpcencryptioncontrol.json

/** Resource Type definition for AWS::EC2::VPCEncryptionControl */
export type AwsEc2Vpcencryptioncontrol = {
  /** The VPC encryption control resource id. */
  VpcEncryptionControlId?: string;
  /**
   * The tags to assign to the VPC encryption control.
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
  /** The VPC on which this VPC encryption control is applied. */
  VpcId?: string;
  /**
   * The VPC encryption control mode, either monitor or enforce.
   * @enum ["monitor","enforce"]
   */
  Mode?: "monitor" | "enforce";
  /**
   * The current state of the VPC encryption control.
   * @enum ["creating","available","monitor-in-progress","enforce-in-progress","monitor-failed","enforce-failed","deleting","deleted","delete-failed"]
   */
  State?: "creating" | "available" | "monitor-in-progress" | "enforce-in-progress" | "monitor-failed" | "enforce-failed" | "deleting" | "deleted" | "delete-failed";
  /** Provides additional context on the state of the VPC encryption control. */
  StateMessage?: string;
  /**
   * Used to enable or disable IGW exclusion
   * @enum ["enable","disable"]
   */
  InternetGatewayExclusionInput?: "enable" | "disable";
  /**
   * Used to enable or disable EIGW exclusion
   * @enum ["enable","disable"]
   */
  EgressOnlyInternetGatewayExclusionInput?: "enable" | "disable";
  /**
   * Used to enable or disable Nat gateway exclusion
   * @enum ["enable","disable"]
   */
  NatGatewayExclusionInput?: "enable" | "disable";
  /**
   * Used to enable or disable VGW exclusion
   * @enum ["enable","disable"]
   */
  VirtualPrivateGatewayExclusionInput?: "enable" | "disable";
  /**
   * Used to enable or disable VPC peering exclusion
   * @enum ["enable","disable"]
   */
  VpcPeeringExclusionInput?: "enable" | "disable";
  /**
   * Used to enable or disable Vpc Lattice exclusion
   * @enum ["enable","disable"]
   */
  VpcLatticeExclusionInput?: "enable" | "disable";
  /**
   * Used to enable or disable EFS exclusion
   * @enum ["enable","disable"]
   */
  ElasticFileSystemExclusionInput?: "enable" | "disable";
  /**
   * Used to enable or disable Lambda exclusion
   * @enum ["enable","disable"]
   */
  LambdaExclusionInput?: "enable" | "disable";
  /** Enumerates the states of all the VPC encryption control resource exclusions */
  ResourceExclusions?: {
    InternetGateway?: {
      State?: string;
      StateMessage?: string;
    };
    EgressOnlyInternetGateway?: {
      State?: string;
      StateMessage?: string;
    };
    NatGateway?: {
      State?: string;
      StateMessage?: string;
    };
    VirtualPrivateGateway?: {
      State?: string;
      StateMessage?: string;
    };
    VpcPeering?: {
      State?: string;
      StateMessage?: string;
    };
    VpcLattice?: {
      State?: string;
      StateMessage?: string;
    };
    ElasticFileSystem?: {
      State?: string;
      StateMessage?: string;
    };
    Lambda?: {
      State?: string;
      StateMessage?: string;
    };
  };
};
