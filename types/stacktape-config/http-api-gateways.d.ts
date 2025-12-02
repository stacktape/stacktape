/**
 * #### HTTP API Gateway
 *
 * ---
 *
 * A fully managed, serverless HTTP API Gateway with pay-per-request pricing.
 */
interface HttpApiGateway {
  type: 'http-api-gateway';
  properties?: HttpApiGatewayProps;
  overrides?: ResourceOverrides;
}

interface HttpApiGatewayProps {
  /**
   * #### Determines the shape of the event delivered to your integrations.
   *
   * ---
   *
   * This value is only used if the payload format is not set on the integration level.
   *
   * For more details on the differences between payload formats, see the [AWS documentation](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations-lambda.html#http-api-develop-integrations-lambda.proxy-format).
   */
  payloadFormat?: '1.0' | '2.0';
  /**
   * #### Configures CORS (Cross-Origin Resource Sharing) HTTP headers for this HTTP API Gateway.
   *
   * ---
   *
   * If CORS is configured using this property, any CORS headers returned from your application will be ignored and replaced.
   */
  cors?: HttpApiCorsConfig;
  /**
   * #### Configures access logging for requests to the HTTP API Gateway.
   *
   * ---
   *
   * The following properties are stored: `requestId`, `ip`, `requestTime`, `httpMethod`, `routeKey`, `status`, `protocol`, and `responseLength`.
   * You can configure the log format using `CLF`, `JSON`, `XML`, or `CSV`.
   *
   * You can access your logs in two ways:
   * 1.  **AWS CloudWatch Console:** Use the `stacktape stack-info` command to get a direct link to the log group.
   * 2.  **Stacktape CLI:** Use the [`stacktape logs` command](https://docs.stacktape.com/cli/commands/logs/) to view logs in your terminal.
   */
  logging?: HttpApiAccessLogsConfig;
  /**
   * #### Attaches custom domains to this HTTP API Gateway.
   *
   * ---
   *
   * When you connect a custom domain, Stacktape automatically:
   *
   * - **Creates DNS records:** A DNS record is created to point your domain name to the resource.
   * - **Adds TLS certificates:** If the resource uses HTTPS, Stacktape issues and attaches a free, AWS-managed TLS certificate, handling TLS termination for you.
   *
   * > To manage a custom domain, it must first be added to your AWS account as a [hosted zone](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/AboutHZWorkingWith.html), and your domain registrar's name servers must point to it.
   * > For more details, see the [Adding a domain guide](https://docs.stacktape.com/other-resources/domains-and-certificates/#adding-domain).
   */
  customDomains?: DomainConfiguration[];
  /**
   * #### Configures an AWS CloudFront CDN (Content Delivery Network) in front of your HTTP API Gateway.
   *
   * ---
   *
   * A CDN is a globally distributed network of edge locations that caches responses from your HTTP API Gateway, bringing content closer to your users.
   *
   * Using a CDN can:
   * - Reduce latency and improve load times.
   * - Lower bandwidth costs.
   * - Decrease the amount of traffic hitting your origin.
   * - Enhance security.
   *
   * The "origin" is the resource (in this case, the HTTP API Gateway) that the CDN is attached to.
   */
  cdn?: CdnConfiguration;
  /**
   * #### Additional alarms associated with this resource.
   *
   * ---
   *
   * These alarms will be merged with any alarms configured globally in the [console](https://console.stacktape.com/alarms).
   */
  alarms?: HttpApiGatewayAlarm[];
  /**
   * #### Disables globally configured alarms for this resource.
   *
   * ---
   *
   * Provide a list of alarm names as configured in the [console](https://console.stacktape.com/alarms).
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
   * #### Disables the collection of access logs to CloudWatch.
   *
   * @default false
   */
  disabled?: boolean;
  /**
   * #### The format of the stored access logs.
   *
   * ---
   *
   * Stored properties include: `requestId`, `ip`, `requestTime`, `httpMethod`, `routeKey`, `status`, `protocol`, and `responseLength`.
   *
   * @default JSON
   */
  format?: 'CLF' | 'JSON' | 'XML' | 'CSV';
  /**
   * #### The number of days to retain logs in the CloudWatch log group.
   *
   * @default 30
   */
  retentionDays?: 1 | 3 | 5 | 7 | 14 | 30 | 60 | 90 | 120 | 150 | 180 | 365 | 400 | 545 | 731 | 1827 | 3653;
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS' | '*';

interface HttpApiCorsConfig {
  /**
   * #### Enables CORS (Cross-Origin Resource Sharing).
   *
   * ---
   *
   * If you do not specify any additional properties, a default CORS configuration is used:
   * - `allowedMethods`: Inferred from the methods used by integrations associated with the API Gateway.
   * - `allowedOrigins`: `*`
   * - `allowedHeaders`: `Content-Type`, `X-Amz-Date`, `Authorization`, `X-Api-Key`, `X-Amz-Security-Token`, `X-Amz-User-Agent`
   *
   * @default false
   */
  enabled: boolean;
  /**
   * #### The origins to accept cross-domain requests from.
   *
   * ---
   *
   * An origin is a combination of a scheme (protocol), hostname (domain), and port.
   *
   * Example: `https://foo.example`
   *
   * @default *
   */
  allowedOrigins?: string[];
  /**
   * #### The allowed HTTP headers.
   *
   * ---
   *
   * Each header name in the `Access-Control-Request-Headers` header of a preflight request must match an entry in this list.
   */
  allowedHeaders?: string[];
  /**
   * #### The allowed HTTP methods.
   *
   * ---
   *
   * By default, Stacktape determines the allowed methods based on the event integrations associated with the gateway.
   */
  allowedMethods?: HttpMethod[];
  /**
   * #### Configures the presence of credentials in the CORS request.
   */
  allowCredentials?: boolean;
  /**
   * #### The response headers that should be made available to scripts running in the browser in response to a cross-origin request.
   */
  exposedResponseHeaders?: string[];
  /**
   * #### The time (in seconds) that the browser can cache the response for a preflight request.
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
