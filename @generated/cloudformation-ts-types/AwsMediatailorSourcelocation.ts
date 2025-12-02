// This file is auto-generated. Do not edit manually.
// Source: aws-mediatailor-sourcelocation.json

/** Definition of AWS::MediaTailor::SourceLocation Resource Type */
export type AwsMediatailorSourcelocation = {
  AccessConfiguration?: {
    AccessType?: "S3_SIGV4" | "SECRETS_MANAGER_ACCESS_TOKEN" | "AUTODETECT_SIGV4";
    SecretsManagerAccessTokenConfiguration?: {
      /**
       * <p>The name of the HTTP header used to supply the access token in requests to the source
       * location.</p>
       */
      HeaderName?: string;
      /**
       * <p>The Amazon Resource Name (ARN) of the AWS Secrets Manager secret that contains the access
       * token.</p>
       */
      SecretArn?: string;
      /**
       * <p>The AWS Secrets Manager <a
       * href="https://docs.aws.amazon.com/secretsmanager/latest/apireference/API_CreateSecret.html#SecretsManager-CreateSecret-request-SecretString.html">SecretString</a>
       * key associated with the access token. MediaTailor uses the key to look up SecretString key and
       * value pair containing the access token.</p>
       */
      SecretStringKey?: string;
    };
  };
  /** <p>The ARN of the source location.</p> */
  Arn?: string;
  DefaultSegmentDeliveryConfiguration?: {
    /**
     * <p>The hostname of the server that will be used to serve segments. This string must include the
     * protocol, such as <b>https://</b>.</p>
     */
    BaseUrl?: string;
  };
  HttpConfiguration: {
    /**
     * <p>The base URL for the source location host server. This string must include the protocol, such as
     * <b>https://</b>.</p>
     */
    BaseUrl: string;
  };
  /** <p>A list of the segment delivery configurations associated with this resource.</p> */
  SegmentDeliveryConfigurations?: {
    /**
     * <p>The base URL of the host or path of the segment delivery server that you're using to serve
     * segments. This is typically a content delivery network (CDN). The URL can be absolute or relative.
     * To use an absolute URL include the protocol, such as <code>https://example.com/some/path</code>. To
     * use a relative URL specify the relative path, such as <code>/some/path*</code>.</p>
     */
    BaseUrl?: string;
    /**
     * <p>A unique identifier used to distinguish between multiple segment delivery configurations in a
     * source location.</p>
     */
    Name?: string;
  }[];
  SourceLocationName: string;
  /**
   * The tags to assign to the source location.
   * @uniqueItems true
   */
  Tags?: {
    Key: string;
    Value: string;
  }[];
};
