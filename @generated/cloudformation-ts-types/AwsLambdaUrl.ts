// This file is auto-generated. Do not edit manually.
// Source: aws-lambda-url.json

/** Resource Type definition for AWS::Lambda::Url */
export type AwsLambdaUrl = {
  /**
   * The Amazon Resource Name (ARN) of the function associated with the Function URL.
   * @pattern ^(arn:(aws[a-zA-Z-]*)?:lambda:)?([a-z]{2}((-gov)|(-iso(b?)))?-[a-z]+-\d{1}:)?(\d{12}:)?(function:)?([a-zA-Z0-9-_]+)(:((?!\d+)[0-9a-zA-Z-_]+))?$
   */
  TargetFunctionArn: string;
  /**
   * The alias qualifier for the target function. If TargetFunctionArn is unqualified then Qualifier
   * must be passed.
   * @minLength 1
   * @maxLength 128
   * @pattern ((?!^[0-9]+$)([a-zA-Z0-9-_]+))
   */
  Qualifier?: string;
  /**
   * Can be either AWS_IAM if the requests are authorized via IAM, or NONE if no authorization is
   * configured on the Function URL.
   * @enum ["AWS_IAM","NONE"]
   */
  AuthType: "AWS_IAM" | "NONE";
  /**
   * The invocation mode for the function's URL. Set to BUFFERED if you want to buffer responses before
   * returning them to the client. Set to RESPONSE_STREAM if you want to stream responses, allowing
   * faster time to first byte and larger response payload sizes. If not set, defaults to BUFFERED.
   * @enum ["BUFFERED","RESPONSE_STREAM"]
   */
  InvokeMode?: "BUFFERED" | "RESPONSE_STREAM";
  /**
   * The full Amazon Resource Name (ARN) of the function associated with the Function URL.
   * @pattern ^(arn:(aws[a-zA-Z-]*)?:lambda:)?([a-z]{2}((-gov)|(-iso(b?)))?-[a-z]+-\d{1}:)?(\d{12}:)?(function:)?([a-zA-Z0-9-_]+)(:((?!\d+)[0-9a-zA-Z-_]+))?$
   */
  FunctionArn?: string;
  /** The generated url for this resource. */
  FunctionUrl?: string;
  Cors?: {
    /** Specifies whether credentials are included in the CORS request. */
    AllowCredentials?: boolean;
    /** Represents a collection of allowed headers. */
    AllowHeaders?: string[];
    /** Represents a collection of allowed HTTP methods. */
    AllowMethods?: ("GET" | "PUT" | "HEAD" | "POST" | "PATCH" | "DELETE" | "*")[];
    /** Represents a collection of allowed origins. */
    AllowOrigins?: string[];
    /** Represents a collection of exposed headers. */
    ExposeHeaders?: string[];
    /**
     * @minimum 0
     * @maximum 86400
     */
    MaxAge?: number;
  };
};
