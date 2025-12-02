// This file is auto-generated. Do not edit manually.
// Source: aws-msk-replicator.json

/** Resource Type definition for AWS::MSK::Replicator */
export type AwsMskReplicator = {
  /**
   * Amazon Resource Name for the created replicator.
   * @pattern arn:(aws|aws-us-gov|aws-cn):kafka:.*
   */
  ReplicatorArn?: string;
  /**
   * The name of the replicator.
   * @minLength 1
   * @maxLength 128
   * @pattern ^[0-9A-Za-z][0-9A-Za-z-]{0,}$
   */
  ReplicatorName: string;
  /** The current version of the MSK replicator. */
  CurrentVersion?: string;
  /**
   * A summary description of the replicator.
   * @maxLength 1024
   */
  Description?: string;
  /**
   * Specifies a list of Kafka clusters which are targets of the replicator.
   * @minItems 2
   * @maxItems 2
   * @uniqueItems true
   */
  KafkaClusters: {
    /** Details of an Amazon MSK cluster. Exactly one of AmazonMskCluster is required. */
    AmazonMskCluster: {
      /**
       * The ARN of an Amazon MSK cluster.
       * @pattern arn:(aws|aws-us-gov|aws-cn):kafka:.*
       */
      MskClusterArn: string;
    };
    /** Details of an Amazon VPC which has network connectivity to the Apache Kafka cluster. */
    VpcConfig: {
      /**
       * The AWS security groups to associate with the elastic network interfaces in order to specify what
       * the replicator has access to. If a security group is not specified, the default security group
       * associated with the VPC is used.
       * @minItems 1
       * @maxItems 16
       * @uniqueItems true
       */
      SecurityGroupIds?: string[];
      /**
       * The list of subnets to connect to in the virtual private cloud (VPC). AWS creates elastic network
       * interfaces inside these subnets.
       * @minItems 2
       * @maxItems 3
       * @uniqueItems true
       */
      SubnetIds: string[];
    };
  }[];
  /**
   * A list of replication configurations, where each configuration targets a given source cluster to
   * target cluster replication flow.
   * @minItems 1
   * @maxItems 1
   * @uniqueItems true
   */
  ReplicationInfoList: ({
    /**
     * Amazon Resource Name of the source Kafka cluster.
     * @pattern arn:(aws|aws-us-gov|aws-cn):kafka:.*
     */
    SourceKafkaClusterArn: string;
    /**
     * Amazon Resource Name of the target Kafka cluster.
     * @pattern arn:(aws|aws-us-gov|aws-cn):kafka:.*
     */
    TargetKafkaClusterArn: string;
    /**
     * The type of compression to use writing records to target Kafka cluster.
     * @enum ["NONE","GZIP","SNAPPY","LZ4","ZSTD"]
     */
    TargetCompressionType: "NONE" | "GZIP" | "SNAPPY" | "LZ4" | "ZSTD";
    /** Configuration relating to topic replication. */
    TopicReplication: {
      /**
       * List of regular expression patterns indicating the topics to copy.
       * @minItems 1
       * @maxItems 100
       * @uniqueItems true
       */
      TopicsToReplicate: string[];
      /**
       * List of regular expression patterns indicating the topics that should not be replicated.
       * @minItems 1
       * @maxItems 100
       * @uniqueItems true
       */
      TopicsToExclude?: string[];
      /** Whether to periodically configure remote topics to match their corresponding upstream topics. */
      CopyTopicConfigurations?: boolean;
      /** Whether to periodically configure remote topic ACLs to match their corresponding upstream topics. */
      CopyAccessControlListsForTopics?: boolean;
      /** Whether to periodically check for new topics and partitions. */
      DetectAndCopyNewTopics?: boolean;
      /** Configuration for specifying the position in the topics to start replicating from. */
      StartingPosition?: {
        Type?: "LATEST" | "EARLIEST";
      };
      /**
       * Configuration for specifying replicated topic names should be the same as their corresponding
       * upstream topics or prefixed with source cluster alias.
       */
      TopicNameConfiguration?: {
        Type?: "PREFIXED_WITH_SOURCE_CLUSTER_ALIAS" | "IDENTICAL";
      };
    };
    /** Configuration relating to consumer group replication. */
    ConsumerGroupReplication: {
      /**
       * List of regular expression patterns indicating the consumer groups to copy.
       * @minItems 0
       * @maxItems 100
       * @uniqueItems true
       */
      ConsumerGroupsToReplicate: string[];
      /**
       * List of regular expression patterns indicating the consumer groups that should not be replicated.
       * @minItems 1
       * @maxItems 100
       * @uniqueItems true
       */
      ConsumerGroupsToExclude?: string[];
      /** Whether to periodically write the translated offsets to __consumer_offsets topic in target cluster. */
      SynchroniseConsumerGroupOffsets?: boolean;
      /** Whether to periodically check for new consumer groups. */
      DetectAndCopyNewConsumerGroups?: boolean;
    };
  })[];
  /**
   * The Amazon Resource Name (ARN) of the IAM role used by the replicator to access external resources.
   * @pattern arn:(aws|aws-us-gov|aws-cn):iam:.*
   */
  ServiceExecutionRoleArn: string;
  /**
   * A collection of tags associated with a resource
   * @uniqueItems true
   */
  Tags?: {
    /**
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /** @maxLength 256 */
    Value: string;
  }[];
};
