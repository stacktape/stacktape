// This file is auto-generated. Do not edit manually.
// Source: aws-events-apidestination.json

/** Resource Type definition for AWS::Events::ApiDestination. */
export type AwsEventsApidestination = {
  /**
   * Name of the apiDestination.
   * @minLength 1
   * @maxLength 64
   * @pattern [\.\-_A-Za-z0-9]+
   */
  Name?: string;
  /** @maxLength 512 */
  Description?: string;
  /**
   * The arn of the connection.
   * @pattern ^arn:aws([a-z]|\-)*:events:([a-z]|\d|\-)*:([0-9]{12})?:connection/[\.\-_A-Za-z0-9]+/[\-A-Za-z0-9]+$
   */
  ConnectionArn: string;
  /**
   * The arn of the api destination.
   * @pattern ^arn:aws([a-z]|\-)*:events:([a-z]|\d|\-)*:([0-9]{12})?:api-destination/[\.\-_A-Za-z0-9]+/[\-A-Za-z0-9]+$
   */
  Arn?: string;
  /**
   * The arn of the api destination to be used in IAM policies.
   * @pattern ^arn:aws([a-z]|\-)*:events:([a-z]|\d|\-)*:([0-9]{12})?:api-destination/[\.\-_A-Za-z0-9]+$
   */
  ArnForPolicy?: string;
  /** @minimum 1 */
  InvocationRateLimitPerSecond?: number;
  /**
   * Url endpoint to invoke.
   * @pattern ^((%[0-9A-Fa-f]{2}|[-()_.!~*';/?:@\x26=+$,A-Za-z0-9])+)([).!';/?:,])?$
   */
  InvocationEndpoint: string;
  /** @enum ["GET","HEAD","POST","OPTIONS","PUT","DELETE","PATCH"] */
  HttpMethod: "GET" | "HEAD" | "POST" | "OPTIONS" | "PUT" | "DELETE" | "PATCH";
};
