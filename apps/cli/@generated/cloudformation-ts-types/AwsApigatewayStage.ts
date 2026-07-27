// This file is auto-generated. Do not edit manually.
// Source: aws-apigateway-stage.json

/** The ``AWS::ApiGateway::Stage`` resource creates a stage for a deployment. */
export type AwsApigatewayStage = {
  AccessLogSetting?: {
    /**
     * The Amazon Resource Name (ARN) of the CloudWatch Logs log group or Kinesis Data Firehose delivery
     * stream to receive access logs. If you specify a Kinesis Data Firehose delivery stream, the stream
     * name must begin with ``amazon-apigateway-``. This parameter is required to enable access logging.
     */
    DestinationArn?: string;
    /**
     * A single line format of the access logs of data, as specified by selected [$context
     * variables](https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-mapping-template-reference.html#context-variable-reference).
     * The format must include at least ``$context.requestId``. This parameter is required to enable
     * access logging.
     */
    Format?: string;
  };
  CacheClusterEnabled?: boolean;
  CacheClusterSize?: string;
  CanarySetting?: {
    DeploymentId?: string;
    /**
     * @minimum 0
     * @maximum 100
     */
    PercentTraffic?: number;
    StageVariableOverrides?: Record<string, string>;
    UseStageCache?: boolean;
  };
  ClientCertificateId?: string;
  DeploymentId?: string;
  Description?: string;
  DocumentationVersion?: string;
  /** @uniqueItems true */
  MethodSettings?: {
    CacheDataEncrypted?: boolean;
    CacheTtlInSeconds?: number;
    CachingEnabled?: boolean;
    DataTraceEnabled?: boolean;
    /**
     * The HTTP method. To apply settings to multiple resources and methods, specify an asterisk (``*``)
     * for the ``HttpMethod`` and ``/*`` for the ``ResourcePath``. This parameter is required when you
     * specify a ``MethodSetting``.
     */
    HttpMethod?: string;
    LoggingLevel?: string;
    MetricsEnabled?: boolean;
    /**
     * The resource path for this method. Forward slashes (``/``) are encoded as ``~1`` and the initial
     * slash must include a forward slash. For example, the path value ``/resource/subresource`` must be
     * encoded as ``/~1resource~1subresource``. To specify the root path, use only a slash (``/``). To
     * apply settings to multiple resources and methods, specify an asterisk (``*``) for the
     * ``HttpMethod`` and ``/*`` for the ``ResourcePath``. This parameter is required when you specify a
     * ``MethodSetting``.
     */
    ResourcePath?: string;
    /** @minimum 0 */
    ThrottlingBurstLimit?: number;
    /** @minimum 0 */
    ThrottlingRateLimit?: number;
  }[];
  RestApiId: string;
  StageName?: string;
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
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
  TracingEnabled?: boolean;
  /**
   * A map (string-to-string map) that defines the stage variables, where the variable name is the key
   * and the variable value is the value. Variable names are limited to alphanumeric characters. Values
   * must match the following regular expression: ``[A-Za-z0-9-._~:/?#&=,]+``.
   */
  Variables?: Record<string, string>;
};
