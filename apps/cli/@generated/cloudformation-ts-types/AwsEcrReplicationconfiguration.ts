// This file is auto-generated. Do not edit manually.
// Source: aws-ecr-replicationconfiguration.json

/**
 * The ``AWS::ECR::ReplicationConfiguration`` resource creates or updates the replication
 * configuration for a private registry. The first time a replication configuration is applied to a
 * private registry, a service-linked IAM role is created in your account for the replication process.
 * For more information, see [Using Service-Linked Roles for Amazon
 * ECR](https://docs.aws.amazon.com/AmazonECR/latest/userguide/using-service-linked-roles.html) in the
 * *Amazon Elastic Container Registry User Guide*.
 * When configuring cross-account replication, the destination account must grant the source account
 * permission to replicate. This permission is controlled using a private registry permissions policy.
 * For more information, see ``AWS::ECR::RegistryPolicy``.
 */
export type AwsEcrReplicationconfiguration = {
  /** The replication configuration for a registry. */
  ReplicationConfiguration: {
    /**
     * An array of objects representing the replication destinations and repository filters for a
     * replication configuration.
     * @minItems 0
     * @maxItems 10
     */
    Rules: {
      /**
       * An array of objects representing the filters for a replication rule. Specifying a repository filter
       * for a replication rule provides a method for controlling which repositories in a private registry
       * are replicated.
       * @minItems 0
       * @maxItems 100
       */
      RepositoryFilters?: {
        /**
         * The repository filter details. When the ``PREFIX_MATCH`` filter type is specified, this value is
         * required and should be the repository name prefix to configure replication for.
         */
        Filter: string;
        /**
         * The repository filter type. The only supported value is ``PREFIX_MATCH``, which is a repository
         * name prefix specified with the ``filter`` parameter.
         */
        FilterType: "PREFIX_MATCH";
      }[];
      /**
       * An array of objects representing the destination for a replication rule.
       * @minItems 1
       * @maxItems 100
       */
      Destinations: {
        /** The Region to replicate to. */
        Region: string;
        /**
         * The AWS account ID of the Amazon ECR private registry to replicate to. When configuring
         * cross-Region replication within your own registry, specify your own account ID.
         */
        RegistryId: string;
      }[];
    }[];
  };
  RegistryId?: string;
};
