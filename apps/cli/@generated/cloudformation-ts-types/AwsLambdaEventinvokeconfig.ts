// This file is auto-generated. Do not edit manually.
// Source: aws-lambda-eventinvokeconfig.json

/**
 * The AWS::Lambda::EventInvokeConfig resource configures options for asynchronous invocation on a
 * version or an alias.
 */
export type AwsLambdaEventinvokeconfig = {
  DestinationConfig?: {
    OnFailure?: {
      /**
       * The Amazon Resource Name (ARN) of the destination resource.
       * @minLength 0
       * @maxLength 350
       * @pattern ^$|arn:(aws[a-zA-Z0-9-]*):([a-zA-Z0-9\-])+:([a-z]+(-[a-z]+)+-\d{1})?:(\d{12})?:(.*)
       */
      Destination: string;
    };
    OnSuccess?: {
      /**
       * The Amazon Resource Name (ARN) of the destination resource.
       * @minLength 0
       * @maxLength 350
       * @pattern ^$|arn:(aws[a-zA-Z0-9-]*):([a-zA-Z0-9\-])+:([a-z]+(-[a-z]+)+-\d{1})?:(\d{12})?:(.*)
       */
      Destination: string;
    };
  };
  /**
   * The name of the Lambda function.
   * @pattern ^(arn:(aws[a-zA-Z-]*)?:lambda:)?([a-z]+(-[a-z]+)+-\d{1}:)?(\d{12}:)?(function:)?([a-zA-Z0-9-_]+)(:(\$LATEST|[a-zA-Z0-9-_]+))?$
   */
  FunctionName: string;
  /**
   * The maximum age of a request that Lambda sends to a function for processing.
   * @minimum 60
   * @maximum 21600
   */
  MaximumEventAgeInSeconds?: number;
  /**
   * The maximum number of times to retry when the function returns an error.
   * @minimum 0
   * @maximum 2
   */
  MaximumRetryAttempts?: number;
  /**
   * The identifier of a version or alias.
   * @pattern ^(|[a-zA-Z0-9$_-]{1,129})$
   */
  Qualifier: string;
};
