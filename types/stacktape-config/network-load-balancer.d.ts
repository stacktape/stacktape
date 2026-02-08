/**
 * #### TCP/TLS load balancer for non-HTTP traffic (MQTT, game servers, custom protocols).
 *
 * ---
 *
 * Handles millions of connections with ultra-low latency. Use when you need raw TCP/TLS
 * instead of HTTP routing. Does not support CDN, firewall, or gradual deployments.
 */
interface NetworkLoadBalancer {
  type: 'network-load-balancer';
  properties: NetworkLoadBalancerProps;
  overrides?: ResourceOverrides;
}

interface NetworkLoadBalancerProps {
  /**
   * #### `internet` (public) or `internal` (VPC-only).
   * @default internet
   */
  interface?: 'internet' | 'internal';
  /**
   * #### Custom domains. Stacktape auto-creates DNS records and TLS certificates for TLS listeners.
   *
   * ---
   *
   * Your domain must be added as a Route53 hosted zone in your AWS account first.
   */
  customDomains?: string[];
  /**
   * #### Listeners define which ports and protocols (TCP/TLS) this load balancer accepts traffic on.
   */
  listeners: NetworkLoadBalancerListener[];
  // /**
  //  * #### Enables HTTPS on the load balancer (default load balancer listener)
  //  * ---
  //  * - If set to true:
  //  *   - load balancer uses HTTPS protocol for the incoming connection
  //  *   - all incoming HTTP protocol connections are redirected to the HTTPS
  //  * - To use this property, you also need to specify custom domain in `customDomains` property
  //  */
  // useHttps?: boolean;
  // /**
  //  * #### Additional alarms associated with this resource
  //  * ---
  //  * - These alarms will be merged with the alarms configured globally in the [console](https://console.stacktape.com/alarms)
  //  */
  // alarms?: NetworkLoadBalancerAlarm[];
  // /**
  //  * #### Disables globally configured alarms specifically for this resource
  //  * ---
  //  * - List of alarm names as configured in the [console](https://console.stacktape.com/alarms)
  //  */
  // disabledGlobalAlarms?: string[];
  // /**
  //  * #### Name of the 'web-app-firewall' resource to use for this load balancer
  //  * ---
  //  * - You can use `web-app-firewall` to protect your resources from common web exploits that could affect application availability, compromise security, or consume excessive resources.
  //  * - Web app firewall protects your application by filtering dangerous requests coming to your app.
  //  *   You can read more about the firewall [in our docs](https://docs.stacktape.com/security-resources/web-app-firewalls/).
  //  */
  // useFirewall?: string;
}

type StpNetworkLoadBalancer = NetworkLoadBalancer['properties'] & {
  name: string;
  type: NetworkLoadBalancer['type'];
  configParentResourceType: WebService['type'] | NetworkLoadBalancer['type'] | PrivateService['type'];
  nameChain: string[];
};

interface NetworkLoadBalancerListener {
  /**
   * #### `TCP` (raw) or `TLS` (encrypted). TLS requires a certificate (auto-created with `customDomains` or via `customCertificateArns`).
   */
  protocol: 'TCP' | 'TLS';
  /**
   * #### Port this listener accepts traffic on.
   */
  port: number;
  /**
   * #### ARNs of your own ACM certificates. Not needed if using `customDomains` or TCP protocol.
   */
  customCertificateArns?: string[];
  /**
   * #### Restrict access to specific IP addresses/CIDRs. Default: all IPs allowed.
   */
  whitelistIps?: string[];
}

interface StpResolvedNetworkLoadBalancerReference
  extends Omit<ContainerWorkloadNetworkLoadBalancerIntegrationProps, 'loadBalancerName'> {
  protocol: 'TCP' | 'TLS';
  loadBalancer: StpNetworkLoadBalancer;
  listenerPort: number;
  listenerHasCustomCerts?: boolean;
}
