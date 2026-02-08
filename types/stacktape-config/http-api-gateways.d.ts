/**
 * #### Serverless HTTP API with pay-per-request pricing (~$1/million requests).
 *
 * ---
 *
 * Routes HTTP requests to Lambda functions, containers, or other backends.
 * No servers to manage. Includes built-in throttling, CORS, and TLS.
 */
interface HttpApiGateway {
  type: 'http-api-gateway';
  properties?: HttpApiGatewayProps;
  overrides?: ResourceOverrides;
}

interface HttpApiGatewayProps {
  /**
   * #### Lambda event payload format. `2.0` is simpler and recommended for new projects.
   *
   * ---
   *
   * Only used if not overridden at the integration level.
   */
  payloadFormat?: '1.0' | '2.0';
  /**
   * #### CORS settings. Overrides any CORS headers from your application code.
   */
  cors?: HttpApiCorsConfig;
  /**
   * #### Access logging (request ID, IP, method, status, etc.). Viewable with `stacktape logs`.
   */
  logging?: HttpApiAccessLogsConfig;
  /**
   * #### Custom domains (e.g., `api.example.com`). Stacktape auto-creates DNS records and TLS certificates.
   *
   * ---
   *
   * Your domain must be added as a Route53 hosted zone in your AWS account first.
   */
  customDomains?: DomainConfiguration[];
  /**
   * #### Put a CDN (CloudFront) in front of this API for caching and lower latency worldwide.
   */
  cdn?: CdnConfiguration;
  /**
   * #### Alarms for this API Gateway (merged with global alarms from the Stacktape Console).
   */
  alarms?: HttpApiGatewayAlarm[];
  /**
   * #### Global alarm names to exclude from this API Gateway.
   */
  disabledGlobalAlarms?: string[];
}

type StpHttpApiGateway = HttpApiGateway['properties'] & {
  name: string;
  type: HttpApiGateway['type'];
  configParentResourceType: WebService['type'] | HttpApiGateway['type'];
  nameChain: string[];
};
// type StpWebServiceHttpApiGateway = Omit<StpHttpApiGateway, 'type'> & { type: WebService['type'] };

interface HttpApiAccessLogsConfig extends LogForwardingBase {
  /**
   * #### Disable access logging.
   * @default false
   */
  disabled?: boolean;
  /**
   * #### Log format. Logs include: requestId, IP, method, status, protocol, responseLength.
   * @default JSON
   */
  format?: 'CLF' | 'JSON' | 'XML' | 'CSV';
  /**
   * #### How many days to keep logs.
   * @default 30
   */
  retentionDays?: 1 | 3 | 5 | 7 | 14 | 30 | 60 | 90 | 120 | 150 | 180 | 365 | 400 | 545 | 731 | 1827 | 3653;
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS' | '*';

interface HttpApiCorsConfig {
  /**
   * #### Enable CORS. With no other options, uses permissive defaults (`*` origins, common headers).
   * @default false
   */
  enabled: boolean;
  /**
   * #### Allowed origins (e.g., `https://myapp.com`). Use `*` for any origin.
   * @default ["*"]
   */
  allowedOrigins?: string[];
  /**
   * #### Allowed request headers in CORS preflight.
   */
  allowedHeaders?: string[];
  /**
   * #### Allowed HTTP methods. Auto-detected from integrations if not set.
   */
  allowedMethods?: HttpMethod[];
  /**
   * #### Allow cookies/auth headers in cross-origin requests.
   */
  allowCredentials?: boolean;
  /**
   * #### Response headers accessible to browser JavaScript.
   */
  exposedResponseHeaders?: string[];
  /**
   * #### How long (seconds) browsers can cache preflight responses.
   */
  maxAge?: number;
}

type HttpApiGatewayReferencableParam =
  | 'domain'
  | 'customDomains'
  | 'url'
  | 'customDomainUrl'
  | 'customDomainUrls'
  | 'canonicalDomain'
  | CdnReferenceableParam;

type HttpApiGatewayOutputs = {
  integrations: {
    url: string | IntrinsicFunction;
    method: string;
    resourceName: string;
  }[];
};
