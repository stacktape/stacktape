// This file is auto-generated. Do not edit manually.
// Source: aws-managedblockchain-node.json

/** Resource Type definition for AWS::ManagedBlockchain::Node */
export type AwsManagedblockchainNode = {
  NodeId?: string;
  MemberId?: string;
  Arn?: string;
  NetworkId: string;
  NodeConfiguration: {
    InstanceType: string;
    AvailabilityZone: string;
  };
};
