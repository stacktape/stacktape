// This file is auto-generated. Do not edit manually.
// Source: aws-cloudformation-lambdahook.json

/** This is a CloudFormation resource for the first-party AWS::Hooks::LambdaHook. */
export type AwsCloudformationLambdahook = {
  /**
   * Amazon Resource Name (ARN), Partial ARN, name, version, or alias of the Lambda function to invoke
   * with this hook.
   * @minLength 1
   * @maxLength 170
   * @pattern (arn:(aws[a-zA-Z-]*)?:lambda:)?([a-z]{2}(-gov)?(-iso([a-z])?)?-[a-z]+-\d{1}:)?(\d{12}:)?(function:)?([a-zA-Z0-9-_]+)(:(\$LATEST|[a-zA-Z0-9-_]+))?
   */
  LambdaFunction: string;
  /**
   * Attribute to specify which stacks this hook applies to or should get invoked for
   * @default "ENABLED"
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
  /** The execution role ARN assumed by Hooks to invoke Lambda. */
  ExecutionRole: string;
};
