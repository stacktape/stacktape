// This file is auto-generated. Do not edit manually.
// Source: aws-msk-serverlesscluster.json

/** Resource Type definition for AWS::MSK::ServerlessCluster */
export type AwsMskServerlesscluster = {
  Arn?: string;
  /**
   * @minLength 1
   * @maxLength 64
   */
  ClusterName: string;
  /** @uniqueItems true */
  VpcConfigs: {
    /** @uniqueItems true */
    SecurityGroups?: string[];
    /** @uniqueItems true */
    SubnetIds: string[];
  }[];
  ClientAuthentication: {
    Sasl: {
      Iam: {
        Enabled: boolean;
      };
    };
  };
  /** A key-value pair to associate with a resource. */
  Tags?: Record<string, string>;
};
