// This file is auto-generated. Do not edit manually.
// Source: aws-codestarconnections-syncconfiguration.json

/**
 * Schema for AWS::CodeStarConnections::SyncConfiguration resource which is used to enables an AWS
 * resource to be synchronized from a source-provider.
 */
export type AwsCodestarconnectionsSyncconfiguration = {
  /**
   * the ID of the entity that owns the repository.
   * @pattern [a-za-z0-9_\.-]+
   */
  OwnerId?: string;
  /**
   * The name of the resource that is being synchronized to the repository.
   * @pattern [a-za-z0-9_\.-]+
   */
  ResourceName: string;
  /**
   * The name of the repository that is being synced to.
   * @pattern [a-za-z0-9_\.-]+
   */
  RepositoryName?: string;
  /**
   * The name of the external provider where your third-party code repository is configured.
   * @enum ["GitHub","Bitbucket","GitHubEnterprise","GitLab","GitLabSelfManaged"]
   */
  ProviderType?: "GitHub" | "Bitbucket" | "GitHubEnterprise" | "GitLab" | "GitLabSelfManaged";
  /** The name of the branch of the repository from which resources are to be synchronized, */
  Branch: string;
  /** The source provider repository path of the sync configuration file of the respective SyncType. */
  ConfigFile: string;
  /** The type of resource synchronization service that is to be configured, for example, CFN_STACK_SYNC. */
  SyncType: string;
  /**
   * The IAM Role that allows AWS to update CloudFormation stacks based on content in the specified
   * repository.
   */
  RoleArn: string;
  /**
   * Whether to enable or disable publishing of deployment status to source providers.
   * @enum ["ENABLED","DISABLED"]
   */
  PublishDeploymentStatus?: "ENABLED" | "DISABLED";
  /**
   * When to trigger Git sync to begin the stack update.
   * @enum ["ANY_CHANGE","FILE_CHANGE"]
   */
  TriggerResourceUpdateOn?: "ANY_CHANGE" | "FILE_CHANGE";
  /**
   * A UUID that uniquely identifies the RepositoryLink that the SyncConfig is associated with.
   * @pattern [0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}
   */
  RepositoryLinkId: string;
};
