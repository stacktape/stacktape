// This file is auto-generated. Do not edit manually.
// Source: aws-dax-cluster.json

/** Resource Type definition for AWS::DAX::Cluster */
export type AwsDaxCluster = {
  SSESpecification?: {
    SSEEnabled?: boolean;
  };
  ClusterDiscoveryEndpointURL?: string;
  Description?: string;
  ReplicationFactor: number;
  ParameterGroupName?: string;
  /** @uniqueItems false */
  AvailabilityZones?: string[];
  IAMRoleARN: string;
  SubnetGroupName?: string;
  PreferredMaintenanceWindow?: string;
  ClusterEndpointEncryptionType?: string;
  NotificationTopicARN?: string;
  /** @uniqueItems false */
  SecurityGroupIds?: string[];
  NetworkType?: string;
  NodeType: string;
  ClusterName?: string;
  ClusterDiscoveryEndpoint?: string;
  Id?: string;
  Arn?: string;
  Tags?: Record<string, unknown>;
};
