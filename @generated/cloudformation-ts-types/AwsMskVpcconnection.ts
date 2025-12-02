// This file is auto-generated. Do not edit manually.
// Source: aws-msk-vpcconnection.json

/** Resource Type definition for AWS::MSK::VpcConnection */
export type AwsMskVpcconnection = {
  Arn?: string;
  Authentication: "SASL_IAM" | "SASL_SCRAM" | "TLS";
  ClientSubnets: string[];
  /**
   * The Amazon Resource Name (ARN) of the target cluster
   * @pattern ^arn:[\w-]+:kafka:[\w-]+:\d+:cluster.*\Z
   */
  TargetClusterArn: string;
  SecurityGroups: string[];
  Tags?: Record<string, string>;
  VpcId: string;
};
