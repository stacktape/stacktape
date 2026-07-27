// This file is auto-generated. Do not edit manually.
// Source: aws-grafana-workspace.json

/** Definition of AWS::Grafana::Workspace Resource Type */
export type AwsGrafanaWorkspace = {
  /**
   * List of authentication providers to enable.
   * @minItems 1
   * @uniqueItems true
   */
  AuthenticationProviders: ("AWS_SSO" | "SAML")[];
  /** The client ID of the AWS SSO Managed Application. */
  SsoClientId?: string;
  SamlConfiguration?: {
    IdpMetadata: {
      /**
       * URL that vends the IdPs metadata.
       * @minLength 1
       * @maxLength 2048
       */
      Url?: string;
      /** XML blob of the IdPs metadata. */
      Xml?: string;
    };
    AssertionAttributes?: {
      /**
       * Name of the attribute within the SAML assert to use as the users name in Grafana.
       * @minLength 1
       * @maxLength 256
       */
      Name?: string;
      /**
       * Name of the attribute within the SAML assert to use as the users login handle in Grafana.
       * @minLength 1
       * @maxLength 256
       */
      Login?: string;
      /**
       * Name of the attribute within the SAML assert to use as the users email in Grafana.
       * @minLength 1
       * @maxLength 256
       */
      Email?: string;
      /**
       * Name of the attribute within the SAML assert to use as the users groups in Grafana.
       * @minLength 1
       * @maxLength 256
       */
      Groups?: string;
      /**
       * Name of the attribute within the SAML assert to use as the users roles in Grafana.
       * @minLength 1
       * @maxLength 256
       */
      Role?: string;
      /**
       * Name of the attribute within the SAML assert to use as the users organizations in Grafana.
       * @minLength 1
       * @maxLength 256
       */
      Org?: string;
    };
    RoleValues?: {
      /** List of SAML roles which will be mapped into the Grafana Editor role. */
      Editor?: string[];
      /** List of SAML roles which will be mapped into the Grafana Admin role. */
      Admin?: string[];
    };
    /** List of SAML organizations allowed to access Grafana. */
    AllowedOrganizations?: string[];
    /**
     * The maximum lifetime an authenticated user can be logged in (in minutes) before being required to
     * re-authenticate.
     */
    LoginValidityDuration?: number;
  };
  NetworkAccessControl?: {
    /**
     * The list of prefix list IDs. A prefix list is a list of CIDR ranges of IP addresses. The IP
     * addresses specified are allowed to access your workspace. If the list is not included in the
     * configuration then no IP addresses will be allowed to access the workspace.
     * @minItems 0
     * @maxItems 5
     * @uniqueItems true
     */
    PrefixListIds?: string[];
    /**
     * The list of Amazon VPC endpoint IDs for the workspace. If a NetworkAccessConfiguration is specified
     * then only VPC endpoints specified here will be allowed to access the workspace.
     * @minItems 0
     * @maxItems 5
     * @uniqueItems true
     */
    VpceIds?: string[];
  };
  VpcConfiguration?: {
    /**
     * The list of Amazon EC2 security group IDs attached to the Amazon VPC for your Grafana workspace to
     * connect.
     * @minItems 1
     * @maxItems 5
     * @uniqueItems true
     */
    SecurityGroupIds: string[];
    /**
     * The list of Amazon EC2 subnet IDs created in the Amazon VPC for your Grafana workspace to connect.
     * @minItems 2
     * @maxItems 6
     * @uniqueItems true
     */
    SubnetIds: string[];
  };
  SamlConfigurationStatus?: "CONFIGURED" | "NOT_CONFIGURED";
  /**
   * A unique, case-sensitive, user-provided identifier to ensure the idempotency of the request.
   * @pattern ^[!-~]{1,64}$
   */
  ClientToken?: string;
  Status?: "ACTIVE" | "CREATING" | "DELETING" | "FAILED" | "UPDATING" | "UPGRADING" | "VERSION_UPDATING" | "DELETION_FAILED" | "CREATION_FAILED" | "UPDATE_FAILED" | "UPGRADE_FAILED" | "LICENSE_REMOVAL_FAILED" | "VERSION_UPDATE_FAILED";
  /** Timestamp when the workspace was created. */
  CreationTimestamp?: string;
  /** Timestamp when the workspace was last modified */
  ModificationTimestamp?: string;
  /**
   * The version of Grafana to support in your workspace.
   * @minLength 1
   * @maxLength 255
   */
  GrafanaVersion?: string;
  /**
   * Endpoint for the Grafana workspace.
   * @minLength 1
   * @maxLength 2048
   */
  Endpoint?: string;
  AccountAccessType: "CURRENT_ACCOUNT" | "ORGANIZATION";
  /**
   * The name of an IAM role that already exists to use with AWS Organizations to access AWS data
   * sources and notification channels in other accounts in an organization.
   * @minLength 1
   * @maxLength 2048
   */
  OrganizationRoleName?: string;
  PermissionType: "CUSTOMER_MANAGED" | "SERVICE_MANAGED";
  /**
   * The name of the AWS CloudFormation stack set to use to generate IAM roles to be used for this
   * workspace.
   */
  StackSetName?: string;
  /** List of data sources on the service managed IAM role. */
  DataSources?: ("AMAZON_OPENSEARCH_SERVICE" | "CLOUDWATCH" | "PROMETHEUS" | "XRAY" | "TIMESTREAM" | "SITEWISE" | "ATHENA" | "REDSHIFT")[];
  /**
   * Description of a workspace.
   * @minLength 0
   * @maxLength 2048
   */
  Description?: string;
  /**
   * The id that uniquely identifies a Grafana workspace.
   * @pattern ^g-[0-9a-f]{10}$
   */
  Id?: string;
  /**
   * The user friendly name of a workspace.
   * @pattern ^[a-zA-Z0-9-._~]{1,255}$
   */
  Name?: string;
  /**
   * List of notification destinations on the customers service managed IAM role that the Grafana
   * workspace can query.
   */
  NotificationDestinations?: "SNS"[];
  /** List of Organizational Units containing AWS accounts the Grafana workspace can pull data from. */
  OrganizationalUnits?: string[];
  /**
   * IAM Role that will be used to grant the Grafana workspace access to a customers AWS resources.
   * @minLength 1
   * @maxLength 2048
   */
  RoleArn?: string;
  /** Allow workspace admins to install plugins */
  PluginAdminEnabled?: boolean;
};
