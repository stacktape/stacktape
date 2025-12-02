/**
 * #### Application Load Balancer
 *
 * ---
 *
 * A fully managed, Application (L7) Load Balancer that routes HTTP and HTTPS requests to other resources.
 */
interface ApplicationLoadBalancer {
  type: 'application-load-balancer';
  properties?: ApplicationLoadBalancerProps;
  overrides?: ResourceOverrides;
}

interface ApplicationLoadBalancerProps {
  /**
   * #### Configures the accessibility of the Load Balancer.
   *
   * ---
   *
   * - `internet`: The Load Balancer is accessible from the internet.
   * - `internal`: The Load Balancer is only accessible from within the same VPC network.
   *
   * To learn more about VPCs, see the [Stacktape documentation](https://docs.stacktape.com/user-guides/vpcs).
   *
   * @default internet
   */
  interface?: 'internet' | 'internal';
  /**
   * #### Configures custom domains for this Load Balancer.
   *
   * ---
   *
   * Stacktape allows you to connect your custom domain names to various resources, including Web Services, HTTP API Gateways, Application Load Balancers, and Buckets with CDNs.
   *
   * When you connect a custom domain, Stacktape automatically:
   *
   * - **Creates DNS records:** A DNS record is created to point your domain name to the resource.
   * - **Adds TLS certificates:** If you are using HTTPS, Stacktape issues and attaches a free, AWS-managed TLS certificate to the resource, handling TLS termination for you.
   *
   * If you want to use your own certificates, you can configure `customCertificateArns` on the listener.
   *
   * > To manage a custom domain, it must first be added to your AWS account as a [hosted zone](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/AboutHZWorkingWith.html), and your domain registrar's name servers must point to it.
   * > For more details, see the [Adding a domain guide](https://docs.stacktape.com/other-resources/domains-and-certificates/#adding-domain).
   */
  customDomains?: string[];
  /**
   * #### Configures custom listeners for this Load Balancer.
   *
   * ---
   *
   * Listeners define the port and protocol that the Load Balancer uses to accept incoming traffic.
   *
   * If you do not specify any listeners, two are created by default:
   * - An HTTPS listener on port 443 (all traffic is routed here).
   * - An HTTP listener on port 80 (which automatically redirects to the HTTPS listener).
   */
  listeners?: ApplicationLoadBalancerListener[];
  /**
   * #### Configures an AWS CloudFront CDN (Content Delivery Network) in front of your Application Load Balancer.
   *
   * ---
   *
   * A CDN is a globally distributed network of edge locations that caches responses from your Application Load Balancer, bringing content closer to your users.
   *
   * Using a CDN can:
   * - Reduce latency and improve load times.
   * - Lower bandwidth costs.
   * - Decrease the amount of traffic hitting your origin.
   * - Enhance security.
   *
   * The "origin" is the resource (in this case, the Application Load Balancer) that the CDN is attached to.
   * The CDN has its own URL endpoint.
   */
  cdn?: ApplicationLoadBalancerCdnConfiguration;
  /**
   * #### Additional alarms associated with this resource.
   *
   * ---
   *
   * These alarms will be merged with any alarms configured globally in the [console](https://console.stacktape.com/alarms).
   */
  alarms?: ApplicationLoadBalancerAlarm[];
  /**
   * #### Disables globally configured alarms for this resource.
   *
   * ---
   *
   * Provide a list of alarm names as configured in the [console](https://console.stacktape.com/alarms).
   */
  disabledGlobalAlarms?: string[];
  /**
   * #### The name of the `web-app-firewall` resource to use for this Load Balancer.
   *
   * ---
   *
   * A `web-app-firewall` can protect your resources from common web exploits that could affect availability, compromise security, or consume excessive resources.
   * The firewall works by filtering malicious requests before they reach your application.
   *
   * For more information, see the [firewall documentation](https://docs.stacktape.com/security-resources/web-app-firewalls/).
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
   * #### The protocol for the listener.
   *
   * ---
   *
   * If you use `HTTPS`, the listener needs an SSL/TLS certificate. This can be configured in two ways:
   * 1.  **Automatic:** Configure `customDomains` to have Stacktape automatically generate and manage the certificate.
   * 2.  **Manual:** Configure `customCertificateArns` to use your own certificate, referenced by its ARN (Amazon Resource Name).
   */
  protocol: 'HTTP' | 'HTTPS';
  /**
   * #### The port number on which the listener is accessible.
   *
   * ---
   *
   * By default, `HTTPS` connections use port `443`, and `HTTP` connections use port `80`.
   */
  port: number;
  /**
   * #### Used to configure custom SSL/TLS certificates.
   *
   * ---
   *
   * This is not necessary if you specify `customDomains` or if you are not using the `HTTPS` protocol for this listener.
   */
  customCertificateArns?: string[];
  /**
   * #### Limits listener accessibility to specific IP addresses.
   *
   * ---
   *
   * By default, all IP addresses are whitelisted.
   */
  whitelistIps?: string[];
  /**
   * #### Configures the listener's behavior for requests that do not match any integration.
   *
   * ---
   *
   * Currently, the only supported default action is `redirect`.
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
   * #### The absolute path to redirect to.
   *
   * ---
   *
   * - Must start with a leading `/`.
   * - Should not be percent-encoded.
   */
  path?: string;
  /**
   * #### The query parameters for the redirect.
   *
   * ---
   *
   * - Should be URL-encoded where necessary, but not percent-encoded.
   * - Do not include the leading `?`, as it is added automatically.
   */
  query?: string;
  /**
   * #### The port for the redirect.
   *
   * ---
   *
   * You can specify a value from 1 to 65535 or `#{port}`.
   */
  port?: number;
  /**
   * #### The hostname for the redirect.
   *
   * ---
   *
   * Should not be percent-encoded.
   */
  host?: string;
  /**
   * #### The protocol for the redirect.
   *
   * ---
   *
   * - Must be `HTTP`, `HTTPS`, or `#{protocol}`.
   * - You cannot redirect from `HTTPS` to `HTTP`.
   */
  protocol?: 'HTTP' | 'HTTPS';
  /**
   * #### The HTTP redirect code.
   *
   * ---
   *
   * - Use `HTTP_301` for a permanent redirect.
   * - Use `HTTP_302` for a temporary redirect.
   */
  statusCode: 'HTTP_301' | 'HTTP_302';
}
interface ApplicationLoadBalancerCdnConfiguration extends CdnConfiguration {
  /**
   * #### The listener port to which CDN traffic will be forwarded.
   *
   * ---
   *
   * You must specify this if the Load Balancer uses custom listeners.
   */
  listenerPort?: number;
  /**
   * #### The origin domain name used for forwarding to the Load Balancer.
   *
   * ---
   *
   * This is only necessary if the Load Balancer has no `customDomains` attached and the listener uses `customCertificateArns`.
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
