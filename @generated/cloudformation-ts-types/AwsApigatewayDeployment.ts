// This file is auto-generated. Do not edit manually.
// Source: aws-apigateway-deployment.json

/**
 * The ``AWS::ApiGateway::Deployment`` resource deploys an API Gateway ``RestApi`` resource to a stage
 * so that clients can call the API over the internet. The stage acts as an environment.
 */
export type AwsApigatewayDeployment = {
  DeploymentId?: string;
  Description?: string;
  /**
   * The description of the Stage resource for the Deployment resource to create. To specify a stage
   * description, you must also provide a stage name.
   */
  StageDescription?: {
    /** The time-to-live (TTL) period, in seconds, that specifies how long API Gateway caches responses. */
    CacheTtlInSeconds?: number;
    /** A description of the purpose of the stage. */
    Description?: string;
    /**
     * The logging level for this method. For valid values, see the ``loggingLevel`` property of the
     * [MethodSetting](https://docs.aws.amazon.com/apigateway/latest/api/API_MethodSetting.html) resource
     * in the *Amazon API Gateway API Reference*.
     */
    LoggingLevel?: string;
    /** Specifies settings for the canary deployment in this stage. */
    CanarySetting?: {
      StageVariableOverrides?: Record<string, string>;
      PercentTraffic?: number;
      UseStageCache?: boolean;
    };
    /**
     * The target request steady-state rate limit. For more information, see [Manage API Request
     * Throttling](https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-request-throttling.html)
     * in the *API Gateway Developer Guide*.
     */
    ThrottlingRateLimit?: number;
    /**
     * The identifier of the client certificate that API Gateway uses to call your integration endpoints
     * in the stage.
     */
    ClientCertificateId?: string;
    /**
     * A map that defines the stage variables. Variable names must consist of alphanumeric characters, and
     * the values must match the following regular expression: ``[A-Za-z0-9-._~:/?#&=,]+``.
     */
    Variables?: Record<string, string>;
    /** The version identifier of the API documentation snapshot. */
    DocumentationVersion?: string;
    /** Indicates whether the cached responses are encrypted. */
    CacheDataEncrypted?: boolean;
    /**
     * Indicates whether data trace logging is enabled for methods in the stage. API Gateway pushes these
     * logs to Amazon CloudWatch Logs.
     */
    DataTraceEnabled?: boolean;
    /**
     * The target request burst rate limit. This allows more requests through for a period of time than
     * the target rate limit. For more information, see [Manage API Request
     * Throttling](https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-request-throttling.html)
     * in the *API Gateway Developer Guide*.
     */
    ThrottlingBurstLimit?: number;
    /**
     * Indicates whether responses are cached and returned for requests. You must enable a cache cluster
     * on the stage to cache responses. For more information, see [Enable API Gateway Caching in a Stage
     * to Enhance API
     * Performance](https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-caching.html)
     * in the *API Gateway Developer Guide*.
     */
    CachingEnabled?: boolean;
    /**
     * Specifies whether active tracing with X-ray is enabled for this stage.
     * For more information, see [Trace API Gateway API Execution with
     * X-Ray](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-xray.html) in the
     * *API Gateway Developer Guide*.
     */
    TracingEnabled?: boolean;
    /**
     * Configures settings for all of the stage's methods.
     * @uniqueItems true
     */
    MethodSettings?: {
      CacheTtlInSeconds?: number;
      LoggingLevel?: string;
      /**
       * The resource path for this method. Forward slashes (``/``) are encoded as ``~1`` and the initial
       * slash must include a forward slash. For example, the path value ``/resource/subresource`` must be
       * encoded as ``/~1resource~1subresource``. To specify the root path, use only a slash (``/``).
       */
      ResourcePath?: string;
      CacheDataEncrypted?: boolean;
      DataTraceEnabled?: boolean;
      ThrottlingBurstLimit?: number;
      CachingEnabled?: boolean;
      MetricsEnabled?: boolean;
      /** The HTTP method. */
      HttpMethod?: string;
      ThrottlingRateLimit?: number;
    }[];
    /** Specifies settings for logging access in this stage. */
    AccessLogSetting?: {
      Format?: string;
      DestinationArn?: string;
    };
    /**
     * The size of the stage's cache cluster. For more information, see
     * [cacheClusterSize](https://docs.aws.amazon.com/apigateway/latest/api/API_CreateStage.html#apigw-CreateStage-request-cacheClusterSize)
     * in the *API Gateway API Reference*.
     */
    CacheClusterSize?: string;
    /** Indicates whether Amazon CloudWatch metrics are enabled for methods in the stage. */
    MetricsEnabled?: boolean;
    /**
     * An array of arbitrary tags (key-value pairs) to associate with the stage.
     * @uniqueItems false
     */
    Tags?: {
      /** The value for the specified tag key. */
      Value: string;
      /**
       * A string you can use to assign a value. The combination of tag keys and values can help you
       * organize and categorize your resources.
       */
      Key: string;
    }[];
    CacheClusterEnabled?: boolean;
  };
  StageName?: string;
  RestApiId: string;
  DeploymentCanarySettings?: {
    StageVariableOverrides?: Record<string, string>;
    PercentTraffic?: number;
    UseStageCache?: boolean;
  };
};
