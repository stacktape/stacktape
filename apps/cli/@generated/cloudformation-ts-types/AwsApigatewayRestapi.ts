// This file is auto-generated. Do not edit manually.
// Source: aws-apigateway-restapi.json

/**
 * The ``AWS::ApiGateway::RestApi`` resource creates a REST API. For more information, see
 * [restapi:create](https://docs.aws.amazon.com/apigateway/latest/api/API_CreateRestApi.html) in the
 * *Amazon API Gateway REST API Reference*.
 * On January 1, 2016, the Swagger Specification was donated to the [OpenAPI
 * initiative](https://docs.aws.amazon.com/https://www.openapis.org/), becoming the foundation of the
 * OpenAPI Specification.
 */
export type AwsApigatewayRestapi = {
  /**
   * A policy document that contains the permissions for the ``RestApi`` resource. To set the ARN for
   * the policy, use the ``!Join`` intrinsic function with ``""`` as delimiter and values of
   * ``"execute-api:/"`` and ``"*"``.
   */
  Policy?: Record<string, unknown> | string;
  /**
   * The Amazon Simple Storage Service (Amazon S3) location that points to an OpenAPI file, which
   * defines a set of RESTful APIs in JSON or YAML format.
   */
  BodyS3Location?: {
    /** The name of the S3 bucket where the OpenAPI file is stored. */
    Bucket?: string;
    /**
     * The Amazon S3 ETag (a file checksum) of the OpenAPI file. If you don't specify a value, API Gateway
     * skips ETag validation of your OpenAPI file.
     */
    ETag?: string;
    /** For versioning-enabled buckets, a specific version of the OpenAPI file. */
    Version?: string;
    /** The file name of the OpenAPI file (Amazon S3 object name). */
    Key?: string;
  };
  Description?: string;
  MinimumCompressionSize?: number;
  Parameters?: Record<string, unknown> | string;
  CloneFrom?: string;
  /**
   * This property applies only when you use OpenAPI to define your REST API. The ``Mode`` determines
   * how API Gateway handles resource updates.
   * Valid values are ``overwrite`` or ``merge``.
   * For ``overwrite``, the new API definition replaces the existing one. The existing API identifier
   * remains unchanged.
   * For ``merge``, the new API definition is merged with the existing API.
   * If you don't specify this property, a default value is chosen. For REST APIs created before March
   * 29, 2021, the default is ``overwrite``. For REST APIs created after March 29, 2021, the new API
   * definition takes precedence, but any container types such as endpoint configurations and binary
   * media types are merged with the existing API.
   * Use the default mode to define top-level ``RestApi`` properties in addition to using OpenAPI.
   * Generally, it's preferred to use API Gateway's OpenAPI extensions to model these properties.
   */
  Mode?: string;
  RestApiId?: string;
  DisableExecuteApiEndpoint?: boolean;
  FailOnWarnings?: boolean;
  /** @uniqueItems true */
  BinaryMediaTypes?: string[];
  /**
   * The name of the RestApi. A name is required if the REST API is not based on an OpenAPI
   * specification.
   */
  Name?: string;
  RootResourceId?: string;
  SecurityPolicy?: string;
  ApiKeySourceType?: string;
  /**
   * A list of the endpoint types and IP address types of the API. Use this property when creating an
   * API. When importing an existing API, specify the endpoint configuration types using the
   * ``Parameters`` property.
   */
  EndpointConfiguration?: {
    IpAddressType?: string;
    /** @uniqueItems true */
    Types?: string[];
    /** @uniqueItems true */
    VpcEndpointIds?: string[];
  };
  /**
   * An OpenAPI specification that defines a set of RESTful APIs in JSON format. For YAML templates, you
   * can also provide the specification in YAML format.
   */
  Body?: Record<string, unknown> | string;
  /** @uniqueItems false */
  Tags?: {
    /** The value for the specified tag key. */
    Value: string;
    /**
     * A string you can use to assign a value. The combination of tag keys and values can help you
     * organize and categorize your resources.
     */
    Key: string;
  }[];
  EndpointAccessMode?: string;
};
