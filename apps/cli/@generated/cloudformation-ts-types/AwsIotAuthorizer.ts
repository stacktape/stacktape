// This file is auto-generated. Do not edit manually.
// Source: aws-iot-authorizer.json

/** Creates an authorizer. */
export type AwsIotAuthorizer = {
  AuthorizerFunctionArn: string;
  Arn?: string;
  /**
   * @minLength 1
   * @maxLength 128
   * @pattern [\w=,@-]+
   */
  AuthorizerName?: string;
  SigningDisabled?: boolean;
  /** @enum ["ACTIVE","INACTIVE"] */
  Status?: "ACTIVE" | "INACTIVE";
  TokenKeyName?: string;
  TokenSigningPublicKeys?: Record<string, string>;
  EnableCachingForHttp?: boolean;
  /** @uniqueItems true */
  Tags?: {
    Key: string;
    Value: string;
  }[];
};
