# Private Service

Resource type: `private-service`

## TypeScript Definition

```typescript
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
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   internalApi:
   *     type: private-service
   *     properties:
   *       packaging:
   *         type: stacktape-image-buildpack
   *         properties:
   *           entryfilePath: src/server.ts
   *       port: 8080
   *       resources:
   *         cpu: 1
   *         memory: 1024
   *       environment:
   *         - name: NODE_ENV
   *           value: production
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { PrivateService, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const internalApi = new PrivateService({
   *     packaging: {
   *       type: 'stacktape-image-buildpack',
   *       properties: {
   *         entryfilePath: 'src/server.ts'
   *       }
   *     },
   *     port: 8080,
   *     resources: {
   *       cpu: 1,
   *       memory: 1024
   *     },
   *     environment: {
   *       NODE_ENV: 'production'
   *     }
   *   });
   *
   *   return { resources: { internalApi } };
   * });
   * ```
   *
   * @default 3000
   */
  port?: number;
  /**
   * #### Protocol for metrics collection. Set to enable protocol-specific metrics (e.g., HTTP 5xx tracking).
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   grpcBackend:
   *     type: private-service
   *     properties:
   *       packaging:
   *         type: stacktape-image-buildpack
   *         properties:
   *           entryfilePath: src/grpc-server.ts
   *       port: 50051
   *       protocol: grpc
   *       resources:
   *         cpu: 2
   *         memory: 2048
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { PrivateService, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const grpcBackend = new PrivateService({
   *     packaging: {
   *       type: 'stacktape-image-buildpack',
   *       properties: {
   *         entryfilePath: 'src/grpc-server.ts'
   *       }
   *     },
   *     port: 50051,
   *     protocol: 'grpc',
   *     resources: {
   *       cpu: 2,
   *       memory: 2048
   *     }
   *   });
   *
   *   return { resources: { grpcBackend } };
   * });
   * ```
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
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   paymentsService:
   *     type: private-service
   *     properties:
   *       packaging:
   *         type: stacktape-image-buildpack
   *         properties:
   *           entryfilePath: src/payments.ts
   *       port: 3000
   *       resources:
   *         cpu: 1
   *         memory: 1024
   *       loadBalancing:
   *         type: application-load-balancer
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { PrivateService, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const paymentsService = new PrivateService({
   *     packaging: {
   *       type: 'stacktape-image-buildpack',
   *       properties: {
   *         entryfilePath: 'src/payments.ts'
   *       }
   *     },
   *     port: 3000,
   *     resources: {
   *       cpu: 1,
   *       memory: 1024
   *     },
   *     loadBalancing: {
   *       type: 'application-load-balancer'
   *     }
   *   });
   *
   *   return { resources: { paymentsService } };
   * });
   * ```
   *
   * @default service-connect
   */
  loadBalancing?: PrivateServiceLoadBalancing;
}

interface PrivateServiceLoadBalancing {
  /**
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   notificationsService:
   *     type: private-service
   *     properties:
   *       packaging:
   *         type: stacktape-image-buildpack
   *         properties:
   *           entryfilePath: src/notifications.ts
   *       port: 3000
   *       resources:
   *         cpu: 1
   *         memory: 1024
   *       loadBalancing:
   *         type: service-connect
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { PrivateService, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const notificationsService = new PrivateService({
   *     packaging: {
   *       type: 'stacktape-image-buildpack',
   *       properties: {
   *         entryfilePath: 'src/notifications.ts'
   *       }
   *     },
   *     port: 3000,
   *     resources: {
   *       cpu: 1,
   *       memory: 1024
   *     },
   *     loadBalancing: {
   *       type: 'service-connect'
   *     }
   *   });
   *
   *   return { resources: { notificationsService } };
   * });
   * ```
   */
  type: ContainerWorkloadServiceConnectIntegration['type'] | ApplicationLoadBalancer['type'];
}

type PrivateServiceReferencableParams = ContainerWorkloadReferencableParam | 'address';
```
