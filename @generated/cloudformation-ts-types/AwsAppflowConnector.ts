// This file is auto-generated. Do not edit manually.
// Source: aws-appflow-connector.json

/** Resource schema for AWS::AppFlow::Connector */
export type AwsAppflowConnector = {
  /**
   * The name of the connector. The name is unique for each ConnectorRegistration in your AWS account.
   * @maxLength 512
   * @pattern [a-zA-Z0-9][\w!@#.-]+
   */
  ConnectorLabel?: string;
  /**
   * The arn of the connector. The arn is unique for each ConnectorRegistration in your AWS account.
   * @maxLength 512
   * @pattern arn:.*:appflow:.*:[0-9]+:.*
   */
  ConnectorArn?: string;
  /**
   * The provisioning type of the connector. Currently the only supported value is LAMBDA.
   * @minLength 1
   * @maxLength 256
   * @pattern [a-zA-Z0-9][\w!@#.-]+
   */
  ConnectorProvisioningType: string;
  /** Contains information about the configuration of the connector being registered. */
  ConnectorProvisioningConfig: {
    /**
     * Contains information about the configuration of the lambda which is being registered as the
     * connector.
     */
    Lambda?: {
      /**
       * Lambda ARN of the connector being registered.
       * @maxLength 512
       * @pattern arn:*:.*:.*:[0-9]+:.*
       */
      LambdaArn: string;
    };
  };
  /**
   * A description about the connector that's being registered.
   * @maxLength 2048
   * @pattern [\s\w/!@#+=.-]*
   */
  Description?: string;
};
