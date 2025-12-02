interface LogForwardingBase {
  /**
   * #### Log Forwarding
   *
   * ---
   *
   * Forwards logs to a specified destination for monitoring, analysis, or long-term storage.
   *
   * Log forwarding is handled by an [Amazon Kinesis Data Firehose](https://aws.amazon.com/kinesis/data-firehose/) delivery stream. You will incur costs based on the volume of data transferred (approximately $0.03 per GB). For detailed pricing, see the [AWS Kinesis Firehose Pricing](https://aws.amazon.com/kinesis/data-firehose/pricing/) page.
   *
   * Supported destinations:
   * - `http-endpoint`: Delivers logs to any HTTP endpoint that complies with [Firehose request and response specifications](https://docs.aws.amazon.com/firehose/latest/dev/httpdeliveryrequestresponse.html). Many third-party logging services are compatible out-of-the-box.
   * - `datadog`: Delivers logs to [Datadog](https://www.datadoghq.com/).
   * - `highlight`: Delivers logs to a [Highlight.io](https://www.highlight.io/) project.
   *
   * For more information, refer to the [Stacktape documentation on log forwarding](https://docs.stacktape.com/configuration/log-forwarding/).
   *
   * > If logs fail to be delivered after multiple retries, they are stored in a backup S3 bucket named `{stackName}-{resourceName}-logs-{generatedHash}`. The retry duration can be configured.
   */
  logForwarding?: HttpEndpointLogForwarding | HighlightLogForwarding | DatadogLogForwarding;
}

interface HttpEndpointLogForwarding {
  type: 'http-endpoint';
  properties: HttpEndpointLogForwardingProps;
}

interface HttpEndpointLogForwardingProps {
  /**
   * #### Endpoint URL
   *
   * ---
   *
   * The HTTPS endpoint where logs will be forwarded.
   */
  endpointUrl: string;
  /**
   * #### Enable GZIP Compression
   *
   * ---
   *
   * If `true`, Firehose will compress the request body using GZIP before sending it to the destination. This can reduce data transfer costs.
   *
   * @default false
   */
  gzipEncodingEnabled?: boolean;
  /**
   * #### Custom Parameters
   *
   * ---
   *
   * Key-value pairs of additional metadata to send to the HTTP endpoint.
   *
   * These parameters are sent in the `X-Amz-Firehose-Common-Attributes` header as a JSON object: `{"commonAttributes":{"param1":"val1", "param2":"val2"}}`.
   */
  parameters?: { [paramName: string]: string };
  /**
   * #### Retry Duration
   *
   * ---
   *
   * The total time Kinesis Data Firehose will spend retrying a failed delivery. This duration begins after the first delivery attempt fails.
   *
   * Logs that cannot be delivered within this duration are sent to a backup S3 bucket.
   *
   * @default 300
   */
  retryDuration?: number;
  /**
   * #### Access Key
   *
   * ---
   *
   * Credentials for authenticating with the endpoint. The key is sent in the `X-Amz-Firehose-Access-Key` header.
   *
   * The value can be any string, such as a JWT token or an access key. It is highly recommended to store the access key as a [Stacktape secret](https://docs.stacktape.com/resources/secrets/).
   */
  accessKey?: string;
}

interface HighlightLogForwarding {
  type: 'highlight';
  properties: HighlightLogForwardingProps;
}

interface HighlightLogForwardingProps {
  /**
   * #### Project ID
   *
   * ---
   *
   * The ID of your [highlight.io](https://www.highlight.io/) project. You can find this in your [highlight.io console](https://app.highlight.io/).
   */
  projectId: string;
  /**
   * #### Endpoint URL
   *
   * ---
   *
   * The HTTPS endpoint where logs will be forwarded.
   *
   * @default "https://pub.highlight.io/v1/logs/firehose"
   */
  endpointUrl?: string;
}

interface DatadogLogForwarding {
  type: 'datadog';
  properties: DatadogLogForwardingProps;
}

interface DatadogLogForwardingProps {
  /**
   * #### API Key
   *
   * ---
   *
   * Your Datadog API key, required for delivering logs. You can find your key in the [Datadog console](https://app.datadoghq.com/organization-settings/api-keys).
   *
   * It is highly recommended to store the API key as a [Stacktape secret](https://docs.stacktape.com/resources/secrets/).
   */
  apiKey: string;
  /**
   * #### Endpoint URL
   *
   * ---
   *
   * The HTTPS endpoint where logs will be forwarded.
   *
   * If your Datadog account is in the EU, you should use `https://aws-kinesis-http-intake.logs.datadoghq.eu/v1/input`.
   *
   * @default "https://aws-kinesis-http-intake.logs.datadoghq.com/v1/input"
   */
  endpointUrl?: string;
}
