interface LogForwardingBase {
  /**
   * #### Forward logs to an external service (Datadog, Highlight.io, or any HTTP endpoint).
   *
   * ---
   *
   * Uses Kinesis Data Firehose (~$0.03/GB). Failed deliveries go to a backup S3 bucket.
   */
  logForwarding?: HttpEndpointLogForwarding | HighlightLogForwarding | DatadogLogForwarding;
}

interface HttpEndpointLogForwarding {
  type: 'http-endpoint';
  properties: HttpEndpointLogForwardingProps;
}

interface HttpEndpointLogForwardingProps {
  /**
   * #### HTTPS endpoint URL where logs are sent.
   */
  endpointUrl: string;
  /**
   * #### Compress request body with GZIP to reduce transfer costs.
   * @default false
   */
  gzipEncodingEnabled?: boolean;
  /**
   * #### Extra metadata sent in the `X-Amz-Firehose-Common-Attributes` header.
   */
  parameters?: { [paramName: string]: string };
  /**
   * #### Total retry time (seconds) before sending failed logs to a backup S3 bucket.
   * @default 300
   */
  retryDuration?: number;
  /**
   * #### Auth credential sent in `X-Amz-Firehose-Access-Key` header. Store as `$Secret()` for security.
   */
  accessKey?: string;
}

interface HighlightLogForwarding {
  type: 'highlight';
  properties: HighlightLogForwardingProps;
}

interface HighlightLogForwardingProps {
  /**
   * #### Your Highlight.io project ID (from the Highlight console).
   */
  projectId: string;
  /**
   * #### Highlight.io endpoint. Override for self-hosted or regional endpoints.
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
   * #### Your Datadog API key. Store as `$Secret()` for security.
   */
  apiKey: string;
  /**
   * #### Datadog endpoint. Use the EU URL if your account is in the EU region.
   * @default "https://aws-kinesis-http-intake.logs.datadoghq.com/v1/input"
   */
  endpointUrl?: string;
}
