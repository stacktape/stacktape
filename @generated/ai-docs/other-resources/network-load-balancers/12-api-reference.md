# API Reference

TypeScript type definitions for this resource.

```typescript
// From stacktape-config/network-load-balancer.d.ts
/**
 * #### Network Load Balancer
 *
 * ---
 *
 * A fully managed, Network (L4) Load Balancer that routes TCP or UDP traffic to other resources.
 */
interface NetworkLoadBalancer {
  type: 'network-load-balancer';
  properties: NetworkLoadBalancerProps;
  overrides?: ResourceOverrides;
}

interface NetworkLoadBalancerProps {
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
   * - **Adds TLS certificates:** If your listeners use TLS, Stacktape issues and attaches a free, AWS-managed TLS certificate to the resource, handling TLS termination for you.
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
   * Traffic routed to a listener is then forwarded to a target resource based on the integrations.
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
   * #### The protocol for the listener.
   *
   * ---
   *
   * If you use `TLS`, the listener needs an SSL/TLS certificate. This can be configured in two ways:
   * 1.  **Automatic:** Configure `customDomains` to have Stacktape automatically generate and manage the certificate.
   * 2.  **Manual:** Configure `customCertificateArns` to use your own certificate, referenced by its ARN (Amazon Resource Name).
   */
  protocol: 'TCP' | 'TLS';
  /**
   * #### The port number on which the listener is accessible.
   *
   * ---
   *
   */
  port: number;
  /**
   * #### Used to configure custom SSL/TLS certificates.
   *
   * ---
   *
   * This is not necessary if you specify `customDomains` or if you are not using the `TLS` protocol for this listener.
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
}

interface StpResolvedNetworkLoadBalancerReference
  extends Omit<ContainerWorkloadNetworkLoadBalancerIntegrationProps, 'loadBalancerName'> {
  protocol: 'TCP' | 'TLS';
  loadBalancer: StpNetworkLoadBalancer;
  listenerPort: number;
  listenerHasCustomCerts?: boolean;
}
```