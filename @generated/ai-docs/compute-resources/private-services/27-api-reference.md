# API Reference

TypeScript type definitions for this resource.

```typescript
// From stacktape-config/private-services.d.ts
/**
 * #### Private Service
 *
 * ---
 *
 * A continuously running container with a private endpoint that is only accessible from within your private network (VPC).
 * It provides an easy setup for scaling, health checks, and other properties.
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
   * #### The port on which the service is available to other resources in the stack.
   *
   * ---
   *
   * The port is injected into the container's runtime as the `PORT` environment variable.
   *
   * > If `loadBalancing` is set to `service-connect` (the default), connections are only possible from other container-based resources (e.g., web services, worker services, multi-container workloads).
   *
   * @default 3000
   */
  port?: number;
  /**
   * #### The Service Connect protocol type.
   *
   * ---
   *
   * If you specify this parameter, AWS is able to capture protocol-specific metrics for the service (e.g., HTTP 5xx responses).
   */
  protocol?: 'http' | 'http2' | 'grpc';
  /**
   * #### Configures the load balancing mechanism to use.
   *
   * ---
   *
   * Supported types are `service-connect` and `application-load-balancer`.
   *
   * - **`service-connect`**:
   *   - Distributes traffic evenly to available containers.
   *   - Connections are only possible from other container-based resources in the stack.
   *   - Supports any TCP protocol.
   *   - This option is significantly cheaper, costing only ~$0.50 per month for a private Cloud Map DNS namespace.
   *
   * - **`application-load-balancer`**:
   *   - Distributes traffic to available containers in a round-robin fashion.
   *   - Supports the HTTP protocol only.
   *   - Uses a pricing model that combines a flat hourly charge (~$0.0252/hour) with usage-based charges for LCUs (Load Balancer Capacity Units) (~$0.08/hour).
   *   - Eligible for the AWS Free Tier. For more details, see the [AWS pricing documentation](https://aws.amazon.com/elasticloadbalancing/pricing/).
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
```