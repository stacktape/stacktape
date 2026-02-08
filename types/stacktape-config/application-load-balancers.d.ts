/**
 * #### HTTP/HTTPS load balancer with flat ~$18/month pricing. Required for WebSockets, firewalls, and gradual deployments.
 *
 * ---
 *
 * Routes requests to containers or Lambda functions based on path, host, headers, or query params.
 * More cost-effective than API Gateway above ~500k requests/day. AWS Free Tier eligible.
 */
interface ApplicationLoadBalancer {
  type: 'application-load-balancer';
  properties?: ApplicationLoadBalancerProps;
  overrides?: ResourceOverrides;
}

interface ApplicationLoadBalancerProps {
  /**
   * #### `internet` (public) or `internal` (VPC-only). Internal ALBs are not reachable from the internet.
   * @default internet
   */
  interface?: 'internet' | 'internal';
  /**
   * #### Custom domains. Stacktape auto-creates DNS records and TLS certificates.
   *
   * ---
   *
   * Your domain must be added as a Route53 hosted zone in your AWS account first.
   * Use `customCertificateArns` on listeners if you want to bring your own certificates.
   */
  customDomains?: string[];
  /**
   * #### Custom listeners (port + protocol). Defaults to HTTPS on 443 + HTTP on 80 (redirecting to HTTPS).
   */
  listeners?: ApplicationLoadBalancerListener[];
  /**
   * #### Put a CDN (CloudFront) in front of this load balancer for caching and lower latency worldwide.
   */
  cdn?: ApplicationLoadBalancerCdnConfiguration;
  /**
   * #### Alarms for this load balancer (merged with global alarms from the Stacktape Console).
   */
  alarms?: ApplicationLoadBalancerAlarm[];
  /**
   * #### Global alarm names to exclude from this load balancer.
   */
  disabledGlobalAlarms?: string[];
  /**
   * #### Name of a `web-app-firewall` resource to protect this load balancer from common web exploits.
   */
  useFirewall?: string;
}

type StpApplicationLoadBalancer = ApplicationLoadBalancer['properties'] & {
  name: string;
  type: ApplicationLoadBalancer['type'];
  configParentResourceType: WebService['type'] | ApplicationLoadBalancer['type'] | PrivateService['type'];
  nameChain: string[];
};

interface StpResolvedLoadBalancerReference
  extends Omit<ContainerWorkloadLoadBalancerIntegrationProps, 'loadBalancerName'> {
  protocol: 'HTTP' | 'HTTPS';
  loadBalancer: StpApplicationLoadBalancer;
  listenerPort: number;
  listenerHasCustomCerts?: boolean;
}

interface ApplicationLoadBalancerListener {
  /**
   * #### Listener protocol. `HTTPS` requires a TLS certificate (auto-created with `customDomains` or via `customCertificateArns`).
   */
  protocol: 'HTTP' | 'HTTPS';
  /**
   * #### Port this listener accepts traffic on (e.g., 443 for HTTPS, 80 for HTTP).
   */
  port: number;
  /**
   * #### ARNs of your own ACM certificates. Not needed if using `customDomains` (Stacktape creates certs automatically).
   */
  customCertificateArns?: string[];
  /**
   * #### Restrict access to specific IP addresses/CIDRs. Default: all IPs allowed.
   */
  whitelistIps?: string[];
  /**
   * #### Action for requests that don't match any integration. Currently supports `redirect` only.
   */
  defaultAction?: LbRedirect;
}

interface LbRedirect {
  /**
   * #### The type of the default action.
   */
  type: 'redirect';
  /**
   * #### Configures where to redirect the request.
   *
   * ---
   *
   * A redirect changes the URI, which has the format: `protocol://hostname:port/path?query`.
   * Unmodified URI components will retain their original values.
   *
   * To avoid redirect loops, ensure that you sufficiently modify the URI.
   * You can reuse URI components with the following keywords: `#{protocol}`, `#{host}`, `#{port}`, `#{path}` (the leading `/` is removed), and `#{query}`.
   *
   * For example, you can change the path to `/new/#{path}`, the hostname to `example.#{host}`, or the query to `#{query}&value=xyz`.
   */
  properties: LbRedirectProperties;
}

interface LbRedirectProperties {
  /**
   * #### Redirect path (must start with `/`). Use `#{path}` to reuse the original path.
   */
  path?: string;
  /**
   * #### Query string for the redirect (without leading `?`). Use `#{query}` to preserve the original.
   */
  query?: string;
  /**
   * #### Redirect port (1-65535). Use `#{port}` to keep the original.
   */
  port?: number;
  /**
   * #### Redirect hostname. Use `#{host}` to keep the original.
   */
  host?: string;
  /**
   * #### Redirect protocol. Cannot redirect HTTPS to HTTP.
   */
  protocol?: 'HTTP' | 'HTTPS';
  /**
   * #### `HTTP_301` (permanent) or `HTTP_302` (temporary) redirect.
   */
  statusCode: 'HTTP_301' | 'HTTP_302';
}
interface ApplicationLoadBalancerCdnConfiguration extends CdnConfiguration {
  /**
   * #### Listener port for CDN traffic. Only needed if using custom listeners.
   */
  listenerPort?: number;
  /**
   * #### Explicit origin domain. Only needed if the ALB has no `customDomains` and uses `customCertificateArns`.
   */
  originDomainName?: string;
}

type ContainerWorkloadTargetDetails = {
  targetProtocol: 'HTTP' | 'TCP';
  targetContainerPort: number;
  // availabilityCheck: LoadBalancerAvailabilityCheck;
  targetContainerName: string;
  targetWorkload: string;
  loadBalancerName: string;
  listenerPorts: Set<number>;
  loadBalancerHealthCheck: LoadBalancerHealthCheck;
};

type LambdaTargetDetails = {
  // workloadName: string;
  // workloadType: Subtype<StpWorkloadType, 'batch-job' | 'function'>;
  // lambdaCfLogicalName: string;
  stpResourceName: string;
  lambdaEndpointArn: IntrinsicFunction | string;
  loadBalancerName: string;
};

type AggregatedTargetsDetails = {
  [targetIdentifier: string]: ContainerWorkloadTargetDetails | LambdaTargetDetails;
};

type ApplicationLoadBalancerReferenceableParam = 'domain' | 'customDomains' | `port${number}` | CdnReferenceableParam;

type ApplicationLoadBalancerOutputs = {
  integrations: {
    urls: (string | IntrinsicFunction)[];
    priority: number;
    methods?: string[];
    hosts?: string[];
    headers?: LbHeaderCondition[];
    queryParams?: LbQueryParamCondition[];
    sourceIps?: string[];
    resourceName: string;
    listenerPort: number;
  }[];
};
