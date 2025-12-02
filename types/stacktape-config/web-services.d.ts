/**
 * #### Web Service
 *
 * ---
 *
 * A continuously running container with a public endpoint (URL) that is accessible from the internet.
 * It includes TLS/SSL out of the box and provides easy configuration for scaling, health checks, and other properties.
 */
interface WebService {
  type: 'web-service';
  properties: WebServiceProps;
  overrides?: ResourceOverrides;
}

interface WebServiceProps extends SimpleServiceContainer {
  /**
   * #### Configures CORS (Cross-Origin Resource Sharing) for this service.
   *
   * ---
   *
   * If CORS is configured using this property, any CORS headers returned from your application will be ignored and replaced.
   *
   * > This property is only effective if the `loadBalancing` type is `http-api-gateway` (the default).
   */
  cors?: HttpApiCorsConfig;
  /**
   * #### Attaches custom domains to this Web Service.
   *
   * ---
   *
   * Stacktape allows you to connect custom domains to various resources, including Web Services, HTTP API Gateways, Application Load Balancers, and Buckets with CDNs.
   *
   * When you connect a custom domain, Stacktape automatically:
   *
   * - **Creates DNS records:** A DNS record is created to point your domain name to the resource.
   * - **Adds TLS certificates:** If the resource uses HTTPS, Stacktape issues and attaches a free, AWS-managed TLS certificate, handling TLS termination for you.
   *
   * If you want to use your own certificates, you can configure `customCertificateArns`.
   *
   * > To manage a custom domain, it must first be added to your AWS account as a [hosted zone](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/AboutHZWorkingWith.html), and your domain registrar's name servers must point to it.
   * > For more details, see the [Adding a domain guide](https://docs.stacktape.com/other-resources/domains-and-certificates/#adding-domain).
   */
  customDomains?: DomainConfiguration[];
  /**
   * #### Configures the entry point used for distributing traffic to containers.
   *
   * ---
   *
   * The following entry point types are supported:
   *
   * - **`http-api-gateway`** (default):
   *   - Distributes traffic to available containers randomly.
   *   - Uses a pay-per-use pricing model (~$1 per million requests).
   *   - Ideal for most workloads, but an `application-load-balancer` may be more cost-effective if you exceed ~500,000 requests per day.
   *
   * - **`application-load-balancer`**:
   *   - Distributes traffic to available containers in a round-robin fashion.
   *   - Uses a pricing model that combines a flat hourly charge (~$0.0252/hour) with usage-based charges for LCUs (Load Balancer Capacity Units) (~$0.08/hour).
   *   - Eligible for the AWS Free Tier. For more details, see the [AWS pricing documentation](https://aws.amazon.com/elasticloadbalancing/pricing/).
   *
   * - **`network-load-balancer`**:
   *   - Supports TCP and TLS protocols.
   *   - Uses the same pricing model as the `application-load-balancer`.
   *   - Also eligible for the AWS Free Tier.
   */
  loadBalancing?: WebServiceHttpApiGatewayLoadBalancing | WebServiceAlbLoadBalancing | WebServiceNlbLoadBalancing;
  /**
   * #### Configures an AWS CloudFront CDN (Content Delivery Network) in front of your Web Service.
   *
   * ---
   *
   * A CDN is a globally distributed network of edge locations that caches responses from your Web Service, bringing content closer to your users.
   *
   * Using a CDN can:
   * - Reduce latency and improve load times.
   * - Lower bandwidth costs.
   * - Decrease the amount of traffic hitting your origin (the Web Service containers).
   * - Enhance security.
   *
   * The CDN caches responses from the origin at the edge for a specified amount of time.
   */
  cdn?: CdnConfiguration;
  /**
   * #### Additional alarms associated with this resource.
   *
   * ---
   *
   * These alarms will be merged with any alarms configured globally in the [console](https://console.stacktape.com/alarms).
   */
  alarms?: (HttpApiGatewayAlarm | ApplicationLoadBalancerAlarm)[];
  /**
   * #### Disables globally configured alarms for this resource.
   *
   * ---
   *
   * Provide a list of alarm names as configured in the [console](https://console.stacktape.com/alarms).
   */
  disabledGlobalAlarms?: string[];
  /**
   * #### Configures the deployment behavior of the Web Service.
   *
   * ---
   *
   * This allows you to safely update your service in a live environment by gradually shifting traffic to the new version.
   * This gives you the opportunity to monitor the workload during the update and quickly roll back in case of any issues.
   *
   * The following deployment strategies are supported:
   * - **`Canary10Percent5Minutes`**: Shifts 10% of traffic, then the remaining 90% five minutes later.
   * - **`Canary10Percent15Minutes`**: Shifts 10% of traffic, then the remaining 90% fifteen minutes later.
   * - **`Linear10PercentEvery1Minute`**: Shifts 10% of traffic every minute until all traffic is shifted.
   * - **`Linear10PercentEvery3Minutes`**: Shifts 10% of traffic every three minutes until all traffic is shifted.
   * - **`AllAtOnce`**: Shifts all traffic to the updated service at once.
   *
   * You can use Lambda function hooks to validate or abort the deployment.
   *
   * > This feature requires the `loadBalancing` type to be set to `application-load-balancer`.
   */
  deployment?: ContainerWorkloadDeploymentConfig;
  /**
   * #### The name of the `web-app-firewall` resource to use for this Web Service.
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

type StpWebService = WebService['properties'] & {
  name: string;
  type: WebService['type'];
  configParentResourceType: WebService['type'];
  nameChain: string[];
  _nestedResources: {
    containerWorkload: StpContainerWorkload;
    httpApiGateway?: StpHttpApiGateway;
    loadBalancer?: StpApplicationLoadBalancer;
    networkLoadBalancer?: StpNetworkLoadBalancer;
  };
};

type WebServiceReferencableParam = HttpApiGatewayReferencableParam | ContainerWorkloadReferencableParam;

interface WebServiceHttpApiGatewayLoadBalancing {
  type: HttpApiGateway['type'];
}

interface WebServiceAlbLoadBalancing {
  type: ApplicationLoadBalancer['type'];
  properties?: WebServiceAlbLoadBalancingProps;
}

interface WebServiceAlbLoadBalancingProps {
  /**
   * #### The path on which the Load Balancer performs health checks.
   *
   * ---
   *
   * @default /
   */
  healthcheckPath?: string;
  /**
   * #### The interval (in seconds) for how often the health check is performed.
   *
   * ---
   *
   * @default 5
   */
  healthcheckInterval?: number;
  /**
   * #### The timeout (in seconds) after which the health check is considered failed.
   *
   * ---
   *
   * @default 4
   */
  healthcheckTimeout?: number;
}

interface WebServiceNlbLoadBalancing {
  type: NetworkLoadBalancer['type'];
  properties: WebServiceNlbLoadBalancingProps;
}

interface WebServiceNlbLoadBalancingProps {
  /**
   * #### The path on which the Load Balancer performs health checks.
   *
   * ---
   *
   * This only takes effect if `healthcheckProtocol` is set to `HTTP`.
   *
   * @default /
   */
  healthcheckPath?: string;
  /**
   * #### The interval (in seconds) for how often the health check is performed.
   *
   * ---
   *
   * Must be between 5 and 300.
   *
   * @default 5
   */
  healthcheckInterval?: number;
  /**
   * #### The timeout (in seconds) after which the health check is considered failed.
   *
   * ---
   *
   * Must be between 2 and 120.
   *
   * @default 4
   */
  healthcheckTimeout?: number;
  /**
   * #### The protocol the Load Balancer uses when performing health checks on targets.
   *
   * ---
   *
   * @default TCP
   */
  healthCheckProtocol?: 'HTTP' | 'TCP';
  /**
   * #### The port the Load Balancer uses when performing health checks on targets.
   *
   * ---
   *
   * By default, this uses the same port that receives traffic from the Load Balancer.
   */
  healthCheckPort?: number;
  ports: WebServiceNlbLoadBalancingPort[];
}

interface WebServiceNlbLoadBalancingPort {
  /**
   * #### The port number exposed by the Load Balancer.
   *
   * ---
   *
   */
  port: number;
  /**
   * #### The protocol to be used for the Load Balancer.
   *
   * ---
   *
   * @default TLS
   */
  protocol?: 'TCP' | 'TLS';
  /**
   * #### The port number on the container that will receive traffic from the Load Balancer.
   *
   * ---
   *
   * Defaults to the same port number specified in the `port` property.
   */
  containerPort?: number;
}
