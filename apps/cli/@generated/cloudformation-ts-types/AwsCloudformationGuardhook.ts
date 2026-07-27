// This file is auto-generated. Do not edit manually.
// Source: aws-cloudformation-guardhook.json

/** This is a CloudFormation resource for activating the first-party AWS::Hooks::GuardHook. */
export type AwsCloudformationGuardhook = {
  RuleLocation: {
    /** S3 uri of Guard files. */
    Uri: string;
    /** S3 object version */
    VersionId?: string;
  };
  /** S3 Bucket where the guard validate report will be uploaded to */
  LogBucket?: string;
  /**
   * Attribute to specify which stacks this hook applies to or should get invoked for
   * @default "DISABLED"
   * @enum ["ENABLED","DISABLED"]
   */
  HookStatus: "ENABLED" | "DISABLED";
  /**
   * Which operations should this Hook run against? Resource changes, stacks or change sets.
   * @uniqueItems true
   */
  TargetOperations: ("RESOURCE" | "STACK" | "CHANGE_SET" | "CLOUD_CONTROL")[];
  /**
   * Attribute to specify CloudFormation behavior on hook failure.
   * @default "WARN"
   * @enum ["FAIL","WARN"]
   */
  FailureMode: "FAIL" | "WARN";
  /** Attribute to specify which targets should invoke the hook */
  TargetFilters?: {
    /**
     * List of type names that the hook is going to target
     * @minItems 1
     * @maxItems 50
     * @uniqueItems true
     */
    TargetNames?: string[];
    /**
     * List of actions that the hook is going to target
     * @minItems 1
     * @maxItems 50
     * @uniqueItems true
     */
    Actions?: ("CREATE" | "UPDATE" | "DELETE")[];
    /**
     * List of invocation points that the hook is going to target
     * @minItems 1
     * @maxItems 50
     * @uniqueItems true
     */
    InvocationPoints?: "PRE_PROVISION"[];
  } | {
    /**
     * List of hook targets
     * @minItems 1
     * @maxItems 50
     * @uniqueItems true
     */
    Targets: ({
      TargetName: string;
      Action: "CREATE" | "UPDATE" | "DELETE";
      InvocationPoint: "PRE_PROVISION";
    })[];
  };
  /** Filters to allow hooks to target specific stack attributes */
  StackFilters?: {
    /**
     * Attribute to specify the filtering behavior. ANY will make the Hook pass if one filter matches. ALL
     * will make the Hook pass if all filters match
     * @default "ALL"
     * @enum ["ALL","ANY"]
     */
    FilteringCriteria: "ALL" | "ANY";
    /** List of stack names as filters */
    StackNames?: {
      /**
       * List of stack names that the hook is going to target
       * @minItems 1
       * @maxItems 50
       * @uniqueItems true
       */
      Include?: string[];
      /**
       * List of stack names that the hook is going to be excluded from
       * @minItems 1
       * @maxItems 50
       * @uniqueItems true
       */
      Exclude?: string[];
    };
    /** List of stack roles that are performing the stack operations. */
    StackRoles?: {
      /**
       * List of stack roles that the hook is going to target
       * @minItems 1
       * @maxItems 50
       * @uniqueItems true
       */
      Include?: (unknown | unknown)[];
      /**
       * List of stack roles that the hook is going to be excluded from
       * @minItems 1
       * @maxItems 50
       * @uniqueItems true
       */
      Exclude?: (unknown | unknown)[];
    };
  };
  /**
   * The typename alias for the hook.
   * @pattern ^(?!(?i)aws)[A-Za-z0-9]{2,64}::[A-Za-z0-9]{2,64}::[A-Za-z0-9]{2,64}$
   */
  Alias: string;
  /**
   * The Amazon Resource Name (ARN) of the activated hook
   * @pattern ^arn:aws[A-Za-z0-9-]{0,64}:cloudformation:[A-Za-z0-9-]{1,64}:([0-9]{12})?:type/hook/.+$
   */
  HookArn?: string;
  /** The execution role ARN assumed by hooks to read Guard rules from S3 and write Guard outputs to S3. */
  ExecutionRole: string;
  Options?: unknown;
};
