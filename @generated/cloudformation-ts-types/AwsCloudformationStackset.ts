// This file is auto-generated. Do not edit manually.
// Source: aws-cloudformation-stackset.json

/** StackSet as a resource provides one-click experience for provisioning a StackSet and StackInstances */
export type AwsCloudformationStackset = {
  /**
   * The name to associate with the stack set. The name must be unique in the Region where you create
   * your stack set.
   * @maxLength 128
   * @pattern ^[a-zA-Z][a-zA-Z0-9\-]{0,127}$
   */
  StackSetName: string;
  /** The ID of the stack set that you're creating. */
  StackSetId?: string;
  /**
   * The Amazon Resource Number (ARN) of the IAM role to use to create this stack set. Specify an IAM
   * role only if you are using customized administrator roles to control which users or groups can
   * manage specific stack sets within the same administrator account.
   * @minLength 20
   * @maxLength 2048
   */
  AdministrationRoleARN?: string;
  /**
   * Describes whether StackSets automatically deploys to AWS Organizations accounts that are added to
   * the target organization or organizational unit (OU). Specify only if PermissionModel is
   * SERVICE_MANAGED.
   */
  AutoDeployment?: {
    /**
     * If set to true, StackSets automatically deploys additional stack instances to AWS Organizations
     * accounts that are added to a target organization or organizational unit (OU) in the specified
     * Regions. If an account is removed from a target organization or OU, StackSets deletes stack
     * instances from the account in the specified Regions.
     */
    Enabled?: boolean;
    /**
     * If set to true, stack resources are retained when an account is removed from a target organization
     * or OU. If set to false, stack resources are deleted. Specify only if Enabled is set to True.
     */
    RetainStacksOnAccountRemoval?: boolean;
    /**
     * A list of StackSet ARNs that this StackSet depends on for auto-deployment operations. When
     * auto-deployment is triggered, operations will be sequenced to ensure all dependencies complete
     * successfully before this StackSet's operation begins.
     * @uniqueItems true
     */
    DependsOn?: string[];
  };
  /**
   * In some cases, you must explicitly acknowledge that your stack set template contains certain
   * capabilities in order for AWS CloudFormation to create the stack set and related stack instances.
   * @uniqueItems true
   */
  Capabilities?: ("CAPABILITY_IAM" | "CAPABILITY_NAMED_IAM" | "CAPABILITY_AUTO_EXPAND")[];
  /**
   * A description of the stack set. You can use the description to identify the stack set's purpose or
   * other important information.
   * @minLength 1
   * @maxLength 1024
   */
  Description?: string;
  /**
   * The name of the IAM execution role to use to create the stack set. If you do not specify an
   * execution role, AWS CloudFormation uses the AWSCloudFormationStackSetExecutionRole role for the
   * stack set operation.
   * @minLength 1
   * @maxLength 64
   */
  ExecutionRoleName?: string;
  OperationPreferences?: {
    /** @minimum 0 */
    FailureToleranceCount?: number;
    /**
     * @minimum 0
     * @maximum 100
     */
    FailureTolerancePercentage?: number;
    /** @minimum 1 */
    MaxConcurrentCount?: number;
    /**
     * @minimum 0
     * @maximum 100
     */
    MaxConcurrentPercentage?: number;
    RegionOrder?: string[];
    RegionConcurrencyType?: "SEQUENTIAL" | "PARALLEL";
    ConcurrencyMode?: "STRICT_FAILURE_TOLERANCE" | "SOFT_FAILURE_TOLERANCE";
  };
  /**
   * A group of stack instances with parameters in some specific accounts and regions.
   * @uniqueItems true
   */
  StackInstancesGroup?: ({
    DeploymentTargets: {
      /**
       * AWS accounts that you want to create stack instances in the specified Region(s) for.
       * @minItems 1
       * @uniqueItems true
       */
      Accounts?: string[];
      /**
       * Returns the value of the AccountsUrl property.
       * @minLength 1
       * @maxLength 5120
       * @pattern (s3://|http(s?)://).+
       */
      AccountsUrl?: string;
      /**
       * The organization root ID or organizational unit (OU) IDs to which StackSets deploys.
       * @minItems 1
       * @uniqueItems true
       */
      OrganizationalUnitIds?: string[];
      /**
       * The filter type you want to apply on organizational units and accounts.
       * @enum ["NONE","UNION","INTERSECTION","DIFFERENCE"]
       */
      AccountFilterType?: "NONE" | "UNION" | "INTERSECTION" | "DIFFERENCE";
    };
    /**
     * The names of one or more Regions where you want to create stack instances using the specified AWS
     * account(s).
     * @minItems 1
     * @uniqueItems true
     */
    Regions: string[];
    /**
     * A list of stack set parameters whose values you want to override in the selected stack instances.
     * @uniqueItems true
     */
    ParameterOverrides?: {
      /**
       * The key associated with the parameter. If you don't specify a key and value for a particular
       * parameter, AWS CloudFormation uses the default value that is specified in your template.
       */
      ParameterKey: string;
      /** The input value associated with the parameter. */
      ParameterValue: string;
    }[];
  })[];
  /**
   * The input parameters for the stack set template.
   * @uniqueItems true
   */
  Parameters?: {
    /**
     * The key associated with the parameter. If you don't specify a key and value for a particular
     * parameter, AWS CloudFormation uses the default value that is specified in your template.
     */
    ParameterKey: string;
    /** The input value associated with the parameter. */
    ParameterValue: string;
  }[];
  /**
   * Describes how the IAM roles required for stack set operations are created. By default, SELF-MANAGED
   * is specified.
   * @enum ["SERVICE_MANAGED","SELF_MANAGED"]
   */
  PermissionModel: "SERVICE_MANAGED" | "SELF_MANAGED";
  /**
   * The key-value pairs to associate with this stack set and the stacks created from it. AWS
   * CloudFormation also propagates these tags to supported resources that are created in the stacks. A
   * maximum number of 50 tags can be specified.
   * @maxItems 50
   * @uniqueItems true
   */
  Tags?: {
    /**
     * A string used to identify this tag. You can specify a maximum of 127 characters for a tag key.
     * @minLength 1
     * @maxLength 128
     * @pattern ^(?!aws:.*)[a-zA-Z0-9\s\:\_\.\/\=\+\-]+$
     */
    Key: string;
    /**
     * A string containing the value for this tag. You can specify a maximum of 256 characters for a tag
     * value.
     * @minLength 1
     * @maxLength 256
     */
    Value: string;
  }[];
  /**
   * The structure that contains the template body, with a minimum length of 1 byte and a maximum length
   * of 51,200 bytes.
   * @minLength 1
   * @maxLength 51200
   */
  TemplateBody?: string;
  /**
   * Location of file containing the template body. The URL must point to a template (max size: 460,800
   * bytes) that is located in an Amazon S3 bucket.
   * @minLength 1
   * @maxLength 5120
   */
  TemplateURL?: string;
  /**
   * Specifies the AWS account that you are acting from. By default, SELF is specified. For self-managed
   * permissions, specify SELF; for service-managed permissions, if you are signed in to the
   * organization's management account, specify SELF. If you are signed in to a delegated administrator
   * account, specify DELEGATED_ADMIN.
   * @enum ["SELF","DELEGATED_ADMIN"]
   */
  CallAs?: "SELF" | "DELEGATED_ADMIN";
  /**
   * Describes whether StackSets performs non-conflicting operations concurrently and queues conflicting
   * operations.
   */
  ManagedExecution?: {
    Active?: boolean;
  };
};
