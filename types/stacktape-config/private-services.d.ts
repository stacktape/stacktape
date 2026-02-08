/**
 * #### Always-on container with a private endpoint, reachable only from other resources in your stack.
 *
 * ---
 *
 * Use for internal APIs, microservices, or gRPC servers that shouldn't be publicly accessible.
 * Other containers in the same stack can reach it by name (e.g., `http://myService:3000`).
 */
interface PrivateService {
  type: 'private-service';
  properties: PrivateServiceProps;
  overrides?: ResourceOverrides;
}

interface PrivateServiceProps extends SimpleServiceContainer {
  // /**
  //  * #### Alias name under which other resources of the stack (web-services, private-services, worker-services, multi-container-workloads) can find this service
  //  * ---
  //  * - Combination of `alias`(host) and `port` creates a unique identifier(address). You can then reach service on the address, i.e. using URL in form `protocol://alias:port` for example `http://my-service:8080` or `grpc://appserver:8080`.
  //  * - By default alias is lowercased name of the resource.
  //  */
  // alias?: string;
  /**
   * #### Port this service listens on. Injected as the `PORT` env var.
   * @default 3000
   */
  port?: number;
  /**
   * #### Protocol for metrics collection. Set to enable protocol-specific metrics (e.g., HTTP 5xx tracking).
   */
  protocol?: 'http' | 'http2' | 'grpc';
  /**
   * #### How traffic reaches this service from other resources.
   *
   * ---
   *
   * - **`service-connect`** (default, ~$0.50/mo): Direct container-to-container. Cheapest option.
   *   Only reachable from other container-based resources in the stack.
   * - **`application-load-balancer`** (~$18/mo): HTTP load balancer. Reachable from any VPC resource.
   *
   * @default service-connect
   */
  loadBalancing?: PrivateServiceLoadBalancing;
}

type StpPrivateService = PrivateService['properties'] & {
  name: string;
  type: PrivateService['type'];
  configParentResourceType: PrivateService['type'];
  nameChain: string[];
  _nestedResources: {
    containerWorkload: StpContainerWorkload;
    loadBalancer?: StpApplicationLoadBalancer;
  };
};

interface PrivateServiceLoadBalancing {
  type: ContainerWorkloadServiceConnectIntegration['type'] | ApplicationLoadBalancer['type'];
}

type PrivateServiceReferencableParams = ContainerWorkloadReferencableParam | 'address';
