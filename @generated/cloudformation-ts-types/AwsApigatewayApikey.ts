// This file is auto-generated. Do not edit manually.
// Source: aws-apigateway-apikey.json

/**
 * The ``AWS::ApiGateway::ApiKey`` resource creates a unique key that you can distribute to clients
 * who are executing API Gateway ``Method`` resources that require an API key. To specify which API
 * key clients must use, map the API key with the ``RestApi`` and ``Stage`` resources that include the
 * methods that require a key.
 */
export type AwsApigatewayApikey = {
  APIKeyId?: string;
  CustomerId?: string;
  Description?: string;
  /** @default false */
  Enabled?: boolean;
  GenerateDistinctId?: boolean;
  /**
   * A name for the API key. If you don't specify a name, CFN generates a unique physical ID and uses
   * that ID for the API key name. For more information, see [Name
   * Type](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-name.html).
   * If you specify a name, you cannot perform updates that require replacement of this resource. You
   * can perform updates that require no or some interruption. If you must replace the resource, specify
   * a new name.
   */
  Name?: string;
  /** @uniqueItems true */
  StageKeys?: {
    RestApiId?: string;
    StageName?: string;
  }[];
  /** @uniqueItems false */
  Tags?: {
    /**
     * A string you can use to assign a value. The combination of tag keys and values can help you
     * organize and categorize your resources.
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * The value for the specified tag key.
     * @maxLength 256
     */
    Value: string;
  }[];
  Value?: string;
};
