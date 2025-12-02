// This file is auto-generated. Do not edit manually.
// Source: aws-lambda-version.json

/** Resource Type definition for AWS::Lambda::Version */
export type AwsLambdaVersion = {
  /**
   * The ARN of the version.
   * @pattern ^(arn:(aws[a-zA-Z-]*)?:lambda:)?((eusc-)?[a-z]{2}((-gov)|(-iso([a-z]?)))?-[a-z]+-\d{1}:)?(\d{12}:)?(function:)?([a-zA-Z0-9-_]+)(:(\$LATEST|[a-zA-Z0-9-_]+))?$
   */
  FunctionArn?: string;
  /**
   * The name of the Lambda function.
   * @minLength 1
   * @maxLength 140
   * @pattern ^(arn:(aws[a-zA-Z-]*)?:lambda:)?((eusc-)?[a-z]{2}((-gov)|(-iso([a-z]?)))?-[a-z]+-\d{1}:)?(\d{12}:)?(function:)?([a-zA-Z0-9-_]+)(:(\$LATEST|[a-zA-Z0-9-_]+))?$
   */
  FunctionName: string;
  /**
   * Specifies a provisioned concurrency configuration for a function's version. Updates are not
   * supported for this property.
   */
  ProvisionedConcurrencyConfig?: {
    /** The amount of provisioned concurrency to allocate for the version. */
    ProvisionedConcurrentExecutions: number;
  };
  /**
   * A description for the version to override the description in the function configuration. Updates
   * are not supported for this property.
   * @minLength 0
   * @maxLength 256
   */
  Description?: string;
  /**
   * Specifies the runtime management configuration of a function. Displays runtimeVersionArn only for
   * Manual.
   */
  RuntimePolicy?: {
    /** The runtime update mode. */
    UpdateRuntimeOn: string;
    /**
     * The ARN of the runtime the function is configured to use. If the runtime update mode is manual, the
     * ARN is returned, otherwise null is returned.
     * @minLength 26
     * @maxLength 2048
     * @pattern ^arn:(aws[a-zA-Z-]*):lambda:(eusc-)?[a-z]{2}((-gov)|(-iso([a-z]?)))?-[a-z]+-\d{1}::runtime:.+$
     */
    RuntimeVersionArn?: string;
  };
  /** The version number. */
  Version?: string;
  /**
   * Only publish a version if the hash value matches the value that's specified. Use this option to
   * avoid publishing a version if the function code has changed since you last updated it. Updates are
   * not supported for this property.
   */
  CodeSha256?: string;
};
