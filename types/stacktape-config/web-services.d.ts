/**
 * #### A container running 24/7 with a public HTTPS URL.
 *
 * ---
 *
 * Use for APIs, web apps, and any service that needs to be always-on and reachable from the internet.
 * Includes TLS/SSL, auto-scaling, health checks, and zero-downtime deployments.
 */
interface WebService {
  type: 'web-service';
  properties: WebServiceProps;
  overrides?: ResourceOverrides;
}

interface WebServiceProps extends SimpleServiceContainer {
  /**
   * #### CORS settings. Overrides any CORS headers from your application.
   *
   * ---
   *
   * Only works with `http-api-gateway` load balancing (the default).
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   apiService:
   *     type: web-service
   *     properties:
   *       packaging:
   *         type: stacktape-image-buildpack
   *         properties:
   *           entryfilePath: src/main.ts
   *       resources:
   *         cpu: 1
   *         memory: 2048
   *       # stp-focus
   *       cors:
   *         enabled: true
   *         allowedOrigins:
   *           - https://app.example.com
   *         allowedMethods:
   *           - GET
   *           - POST
   *         allowCredentials: true
   *       # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { defineConfig, WebService, StacktapeImageBuildpackPackaging } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const apiService = new WebService({
   *     packaging: new StacktapeImageBuildpackPackaging({
   *       entryfilePath: 'src/main.ts'
   *     }),
   *     resources: {
   *       cpu: 1,
   *       memory: 2048
   *     },
   *     // stp-focus
   *     cors: {
   *       enabled: true,
   *       allowedOrigins: ['https://app.example.com'],
   *       allowedMethods: ['GET', 'POST'],
   *       allowCredentials: true
   *     }
   *     // stp-end-focus
   *   });
   *
   *   return {
   *     resources: { apiService }
   *   };
   * });
   * ```
   */
  cors?: HttpApiCorsConfig;
  /**
   * #### Custom domains (e.g., `api.example.com`). Stacktape auto-creates DNS records and TLS certificates.
   *
   * ---
   *
   * Your domain must be added as a Route53 hosted zone in your AWS account first.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   apiService:
   *     type: web-service
   *     properties:
   *       packaging:
   *         type: stacktape-image-buildpack
   *         properties:
   *           entryfilePath: src/main.ts
   *       resources:
   *         cpu: 1
   *         memory: 2048
   *       # stp-focus
   *       customDomains:
   *         - domainName: api.example.com
   *       # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { defineConfig, WebService, StacktapeImageBuildpackPackaging } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const apiService = new WebService({
   *     packaging: new StacktapeImageBuildpackPackaging({
   *       entryfilePath: 'src/main.ts'
   *     }),
   *     resources: {
   *       cpu: 1,
   *       memory: 2048
   *     },
   *     // stp-focus
   *     customDomains: [{ domainName: 'api.example.com' }]
   *     // stp-end-focus
   *   });
   *
   *   return {
   *     resources: { apiService }
   *   };
   * });
   * ```
   */
  customDomains?: DomainConfiguration[];
  /**
   * #### How traffic reaches your containers. Affects pricing, features, and protocol support.
   *
   * ---
   *
   * - **`http-api-gateway`** (default): Pay-per-request (~$1/million requests). Best for most apps.
   *   Cheapest at low traffic, but costs grow with volume.
   *
   * - **`application-load-balancer`**: Flat ~$18/month + usage. Required for gradual deployments
   *   (`deployment`), top-level firewalls (`useFirewall`), and WebSocket support.
   *   More cost-effective above ~500k requests/day. AWS Free Tier eligible.
   *
   * - **`network-load-balancer`**: For non-HTTP traffic (TCP/TLS) like MQTT, game servers, or custom protocols.
   *   Requires explicit `ports` configuration. Does not support CDN, top-level firewall, or gradual deployments.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   apiService:
   *     type: web-service
   *     properties:
   *       packaging:
   *         type: stacktape-image-buildpack
   *         properties:
   *           entryfilePath: src/main.ts
   *       resources:
   *         cpu: 1
   *         memory: 2048
   *       # stp-focus
   *       loadBalancing:
   *         type: application-load-balancer
   *       # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { defineConfig, WebService, StacktapeImageBuildpackPackaging } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const apiService = new WebService({
   *     packaging: new StacktapeImageBuildpackPackaging({
   *       entryfilePath: 'src/main.ts'
   *     }),
   *     resources: {
   *       cpu: 1,
   *       memory: 2048
   *     },
   *     // stp-focus
   *     loadBalancing: {
   *       type: 'application-load-balancer'
   *     }
   *     // stp-end-focus
   *   });
   *
   *   return {
   *     resources: { apiService }
   *   };
   * });
   * ```
   */
  loadBalancing?: WebServiceHttpApiGatewayLoadBalancing | WebServiceAlbLoadBalancing | WebServiceNlbLoadBalancing;
  /**
   * #### Put a CDN (CloudFront) in front of this service for caching and lower latency worldwide.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   apiService:
   *     type: web-service
   *     properties:
   *       packaging:
   *         type: stacktape-image-buildpack
   *         properties:
   *           entryfilePath: src/main.ts
   *       resources:
   *         cpu: 1
   *         memory: 2048
   *       # stp-focus
   *       cdn:
   *         enabled: true
   *       # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { defineConfig, WebService, StacktapeImageBuildpackPackaging } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const apiService = new WebService({
   *     packaging: new StacktapeImageBuildpackPackaging({
   *       entryfilePath: 'src/main.ts'
   *     }),
   *     resources: {
   *       cpu: 1,
   *       memory: 2048
   *     },
   *     // stp-focus
   *     cdn: {
   *       enabled: true
   *     }
   *     // stp-end-focus
   *   });
   *
   *   return {
   *     resources: { apiService }
   *   };
   * });
   * ```
   */
  cdn?: CdnConfiguration;
  /**
   * #### Alarms for this service (merged with global alarms from the Stacktape Console).
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   apiService:
   *     type: web-service
   *     properties:
   *       packaging:
   *         type: stacktape-image-buildpack
   *         properties:
   *           entryfilePath: src/main.ts
   *       resources:
   *         cpu: 1
   *         memory: 2048
   *       # stp-focus
   *       alarms:
   *         - trigger:
   *             type: http-api-gateway-error-rate
   *             properties:
   *               thresholdPercent: 5
   *           notificationTargets:
   *             - type: email
   *               properties:
   *                 sender: alerts@example.com
   *                 recipient: oncall@example.com
   *       # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { defineConfig, WebService, StacktapeImageBuildpackPackaging } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const apiService = new WebService({
   *     packaging: new StacktapeImageBuildpackPackaging({
   *       entryfilePath: 'src/main.ts'
   *     }),
   *     resources: {
   *       cpu: 1,
   *       memory: 2048
   *     },
   *     // stp-focus
   *     alarms: [
   *       {
   *         trigger: {
   *           type: 'http-api-gateway-error-rate',
   *           properties: {
   *             thresholdPercent: 5
   *           }
   *         },
   *         notificationTargets: [
   *           {
   *             type: 'email',
   *             properties: {
   *               sender: 'alerts@example.com',
   *               recipient: 'oncall@example.com'
   *             }
   *           }
   *         ]
   *       }
   *     ]
   *     // stp-end-focus
   *   });
   *
   *   return {
   *     resources: { apiService }
   *   };
   * });
   * ```
   */
  alarms?: (HttpApiGatewayAlarm | ApplicationLoadBalancerAlarm)[];
  /**
   * #### Global alarm names to exclude from this service.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   apiService:
   *     type: web-service
   *     properties:
   *       packaging:
   *         type: stacktape-image-buildpack
   *         properties:
   *           entryfilePath: src/main.ts
   *       resources:
   *         cpu: 1
   *         memory: 2048
   *       # stp-focus
   *       disabledGlobalAlarms:
   *         - high-error-rate
   *         - high-latency
   *       # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { defineConfig, WebService, StacktapeImageBuildpackPackaging } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const apiService = new WebService({
   *     packaging: new StacktapeImageBuildpackPackaging({
   *       entryfilePath: 'src/main.ts'
   *     }),
   *     resources: {
   *       cpu: 1,
   *       memory: 2048
   *     },
   *     // stp-focus
   *     disabledGlobalAlarms: ['high-error-rate', 'high-latency']
   *     // stp-end-focus
   *   });
   *
   *   return {
   *     resources: { apiService }
   *   };
   * });
   * ```
   */
  disabledGlobalAlarms?: string[];
  /**
   * #### Gradual traffic shifting for safe deployments (canary, linear, or all-at-once).
   *
   * ---
   *
   * Requires `loadBalancing` type `application-load-balancer`.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   apiService:
   *     type: web-service
   *     properties:
   *       packaging:
   *         type: stacktape-image-buildpack
   *         properties:
   *           entryfilePath: src/main.ts
   *       resources:
   *         cpu: 1
   *         memory: 2048
   *       loadBalancing:
   *         type: application-load-balancer
   *       # stp-focus
   *       deployment:
   *         strategy: Canary10Percent5Minutes
   *       # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { defineConfig, WebService, StacktapeImageBuildpackPackaging } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const apiService = new WebService({
   *     packaging: new StacktapeImageBuildpackPackaging({
   *       entryfilePath: 'src/main.ts'
   *     }),
   *     resources: {
   *       cpu: 1,
   *       memory: 2048
   *     },
   *     loadBalancing: {
   *       type: 'application-load-balancer'
   *     },
   *     // stp-focus
   *     deployment: {
   *       strategy: 'Canary10Percent5Minutes'
   *     }
   *     // stp-end-focus
   *   });
   *
   *   return {
   *     resources: { apiService }
   *   };
   * });
   * ```
   */
  deployment?: ContainerWorkloadDeploymentConfig;
  /**
   * #### Name of a `web-app-firewall` resource to protect this service from common web exploits.
   *
   * ---
   *
   * Attaches a regional firewall directly to the service's application load balancer.
   * Requires `loadBalancing` type `application-load-balancer`.
   *
   * To protect a CDN-enabled service at CloudFront instead, use `cdn.useFirewall`
   * with a `web-app-firewall` resource whose `scope` is `cdn`.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   serviceFirewall:
   *     type: web-app-firewall
   *     properties:
   *       scope: regional
   *   apiService:
   *     type: web-service
   *     properties:
   *       packaging:
   *         type: stacktape-image-buildpack
   *         properties:
   *           entryfilePath: src/main.ts
   *       resources:
   *         cpu: 1
   *         memory: 2048
   *       loadBalancing:
   *         type: application-load-balancer
   *       # stp-focus
   *       useFirewall: serviceFirewall
   *       # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { defineConfig, WebService, WebAppFirewall, StacktapeImageBuildpackPackaging } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const serviceFirewall = new WebAppFirewall({
   *     scope: 'regional'
   *   });
   *
   *   const apiService = new WebService({
   *     packaging: new StacktapeImageBuildpackPackaging({
   *       entryfilePath: 'src/main.ts'
   *     }),
   *     resources: {
   *       cpu: 1,
   *       memory: 2048
   *     },
   *     loadBalancing: {
   *       type: 'application-load-balancer'
   *     },
   *     // stp-focus
   *     useFirewall: 'serviceFirewall'
   *     // stp-end-focus
   *   });
   *
   *   return {
   *     resources: { serviceFirewall, apiService }
   *   };
   * });
   * ```
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
   * #### Path the load balancer pings to check container health.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   apiService:
   *     type: web-service
   *     properties:
   *       packaging:
   *         type: stacktape-image-buildpack
   *         properties:
   *           entryfilePath: src/main.ts
   *       resources:
   *         cpu: 1
   *         memory: 2048
   *       loadBalancing:
   *         type: application-load-balancer
   *         properties:
   *           # stp-focus
   *           healthcheckPath: /health
   *           # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { defineConfig, WebService, StacktapeImageBuildpackPackaging } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const apiService = new WebService({
   *     packaging: new StacktapeImageBuildpackPackaging({
   *       entryfilePath: 'src/main.ts'
   *     }),
   *     resources: {
   *       cpu: 1,
   *       memory: 2048
   *     },
   *     loadBalancing: {
   *       type: 'application-load-balancer',
   *       properties: {
   *         // stp-focus
   *         healthcheckPath: '/health'
   *         // stp-end-focus
   *       }
   *     }
   *   });
   *
   *   return {
   *     resources: { apiService }
   *   };
   * });
   * ```
   *
   * @default /
   */
  healthcheckPath?: string;
  /**
   * #### Seconds between health checks.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   apiService:
   *     type: web-service
   *     properties:
   *       packaging:
   *         type: stacktape-image-buildpack
   *         properties:
   *           entryfilePath: src/main.ts
   *       resources:
   *         cpu: 1
   *         memory: 2048
   *       loadBalancing:
   *         type: application-load-balancer
   *         properties:
   *           healthcheckPath: /health
   *           # stp-focus
   *           healthcheckInterval: 10
   *           # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { defineConfig, WebService, StacktapeImageBuildpackPackaging } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const apiService = new WebService({
   *     packaging: new StacktapeImageBuildpackPackaging({
   *       entryfilePath: 'src/main.ts'
   *     }),
   *     resources: {
   *       cpu: 1,
   *       memory: 2048
   *     },
   *     loadBalancing: {
   *       type: 'application-load-balancer',
   *       properties: {
   *         healthcheckPath: '/health',
   *         // stp-focus
   *         healthcheckInterval: 10
   *         // stp-end-focus
   *       }
   *     }
   *   });
   *
   *   return {
   *     resources: { apiService }
   *   };
   * });
   * ```
   *
   * @default 5
   */
  healthcheckInterval?: number;
  /**
   * #### Seconds before a health check is considered failed.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   apiService:
   *     type: web-service
   *     properties:
   *       packaging:
   *         type: stacktape-image-buildpack
   *         properties:
   *           entryfilePath: src/main.ts
   *       resources:
   *         cpu: 1
   *         memory: 2048
   *       loadBalancing:
   *         type: application-load-balancer
   *         properties:
   *           healthcheckPath: /health
   *           healthcheckInterval: 10
   *           # stp-focus
   *           healthcheckTimeout: 5
   *           # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { defineConfig, WebService, StacktapeImageBuildpackPackaging } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const apiService = new WebService({
   *     packaging: new StacktapeImageBuildpackPackaging({
   *       entryfilePath: 'src/main.ts'
   *     }),
   *     resources: {
   *       cpu: 1,
   *       memory: 2048
   *     },
   *     loadBalancing: {
   *       type: 'application-load-balancer',
   *       properties: {
   *         healthcheckPath: '/health',
   *         healthcheckInterval: 10,
   *         // stp-focus
   *         healthcheckTimeout: 5
   *         // stp-end-focus
   *       }
   *     }
   *   });
   *
   *   return {
   *     resources: { apiService }
   *   };
   * });
   * ```
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
   * #### Health check path (only used when `healthCheckProtocol` is `HTTP`).
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   tcpService:
   *     type: web-service
   *     properties:
   *       packaging:
   *         type: stacktape-image-buildpack
   *         properties:
   *           entryfilePath: src/main.ts
   *       resources:
   *         cpu: 1
   *         memory: 2048
   *       loadBalancing:
   *         type: network-load-balancer
   *         properties:
   *           healthCheckProtocol: HTTP
   *           # stp-focus
   *           healthcheckPath: /health
   *           # stp-end-focus
   *           ports:
   *             - port: 443
   *               containerPort: 8080
   *               protocol: TLS
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { defineConfig, WebService, StacktapeImageBuildpackPackaging } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const tcpService = new WebService({
   *     packaging: new StacktapeImageBuildpackPackaging({
   *       entryfilePath: 'src/main.ts'
   *     }),
   *     resources: {
   *       cpu: 1,
   *       memory: 2048
   *     },
   *     loadBalancing: {
   *       type: 'network-load-balancer',
   *       properties: {
   *         healthCheckProtocol: 'HTTP',
   *         // stp-focus
   *         healthcheckPath: '/health',
   *         // stp-end-focus
   *         ports: [{ port: 443, containerPort: 8080, protocol: 'TLS' }]
   *       }
   *     }
   *   });
   *
   *   return {
   *     resources: { tcpService }
   *   };
   * });
   * ```
   *
   * @default /
   */
  healthcheckPath?: string;
  /**
   * #### Seconds between health checks (5-300).
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   tcpService:
   *     type: web-service
   *     properties:
   *       packaging:
   *         type: stacktape-image-buildpack
   *         properties:
   *           entryfilePath: src/main.ts
   *       resources:
   *         cpu: 1
   *         memory: 2048
   *       loadBalancing:
   *         type: network-load-balancer
   *         properties:
   *           # stp-focus
   *           healthcheckInterval: 30
   *           # stp-end-focus
   *           ports:
   *             - port: 443
   *               containerPort: 8080
   *               protocol: TLS
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { defineConfig, WebService, StacktapeImageBuildpackPackaging } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const tcpService = new WebService({
   *     packaging: new StacktapeImageBuildpackPackaging({
   *       entryfilePath: 'src/main.ts'
   *     }),
   *     resources: {
   *       cpu: 1,
   *       memory: 2048
   *     },
   *     loadBalancing: {
   *       type: 'network-load-balancer',
   *       properties: {
   *         // stp-focus
   *         healthcheckInterval: 30,
   *         // stp-end-focus
   *         ports: [{ port: 443, containerPort: 8080, protocol: 'TLS' }]
   *       }
   *     }
   *   });
   *
   *   return {
   *     resources: { tcpService }
   *   };
   * });
   * ```
   *
   * @default 5
   */
  healthcheckInterval?: number;
  /**
   * #### Seconds before a health check is considered failed (2-120).
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   tcpService:
   *     type: web-service
   *     properties:
   *       packaging:
   *         type: stacktape-image-buildpack
   *         properties:
   *           entryfilePath: src/main.ts
   *       resources:
   *         cpu: 1
   *         memory: 2048
   *       loadBalancing:
   *         type: network-load-balancer
   *         properties:
   *           healthcheckInterval: 30
   *           # stp-focus
   *           healthcheckTimeout: 10
   *           # stp-end-focus
   *           ports:
   *             - port: 443
   *               containerPort: 8080
   *               protocol: TLS
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { defineConfig, WebService, StacktapeImageBuildpackPackaging } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const tcpService = new WebService({
   *     packaging: new StacktapeImageBuildpackPackaging({
   *       entryfilePath: 'src/main.ts'
   *     }),
   *     resources: {
   *       cpu: 1,
   *       memory: 2048
   *     },
   *     loadBalancing: {
   *       type: 'network-load-balancer',
   *       properties: {
   *         healthcheckInterval: 30,
   *         // stp-focus
   *         healthcheckTimeout: 10,
   *         // stp-end-focus
   *         ports: [{ port: 443, containerPort: 8080, protocol: 'TLS' }]
   *       }
   *     }
   *   });
   *
   *   return {
   *     resources: { tcpService }
   *   };
   * });
   * ```
   *
   * @default 4
   */
  healthcheckTimeout?: number;
  /**
   * #### Health check protocol: `TCP` (port check) or `HTTP` (path check).
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   tcpService:
   *     type: web-service
   *     properties:
   *       packaging:
   *         type: stacktape-image-buildpack
   *         properties:
   *           entryfilePath: src/main.ts
   *       resources:
   *         cpu: 1
   *         memory: 2048
   *       loadBalancing:
   *         type: network-load-balancer
   *         properties:
   *           # stp-focus
   *           healthCheckProtocol: HTTP
   *           # stp-end-focus
   *           healthcheckPath: /health
   *           ports:
   *             - port: 443
   *               containerPort: 8080
   *               protocol: TLS
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { defineConfig, WebService, StacktapeImageBuildpackPackaging } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const tcpService = new WebService({
   *     packaging: new StacktapeImageBuildpackPackaging({
   *       entryfilePath: 'src/main.ts'
   *     }),
   *     resources: {
   *       cpu: 1,
   *       memory: 2048
   *     },
   *     loadBalancing: {
   *       type: 'network-load-balancer',
   *       properties: {
   *         // stp-focus
   *         healthCheckProtocol: 'HTTP',
   *         // stp-end-focus
   *         healthcheckPath: '/health',
   *         ports: [{ port: 443, containerPort: 8080, protocol: 'TLS' }]
   *       }
   *     }
   *   });
   *
   *   return {
   *     resources: { tcpService }
   *   };
   * });
   * ```
   *
   * @default TCP
   */
  healthCheckProtocol?: 'HTTP' | 'TCP';
  /**
   * #### Health check port. Defaults to the traffic port.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   tcpService:
   *     type: web-service
   *     properties:
   *       packaging:
   *         type: stacktape-image-buildpack
   *         properties:
   *           entryfilePath: src/main.ts
   *       resources:
   *         cpu: 1
   *         memory: 2048
   *       loadBalancing:
   *         type: network-load-balancer
   *         properties:
   *           healthCheckProtocol: TCP
   *           # stp-focus
   *           healthCheckPort: 8081
   *           # stp-end-focus
   *           ports:
   *             - port: 443
   *               containerPort: 8080
   *               protocol: TLS
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { defineConfig, WebService, StacktapeImageBuildpackPackaging } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const tcpService = new WebService({
   *     packaging: new StacktapeImageBuildpackPackaging({
   *       entryfilePath: 'src/main.ts'
   *     }),
   *     resources: {
   *       cpu: 1,
   *       memory: 2048
   *     },
   *     loadBalancing: {
   *       type: 'network-load-balancer',
   *       properties: {
   *         healthCheckProtocol: 'TCP',
   *         // stp-focus
   *         healthCheckPort: 8081,
   *         // stp-end-focus
   *         ports: [{ port: 443, containerPort: 8080, protocol: 'TLS' }]
   *       }
   *     }
   *   });
   *
   *   return {
   *     resources: { tcpService }
   *   };
   * });
   * ```
   */
  healthCheckPort?: number;
  ports: WebServiceNlbLoadBalancingPort[];
}

interface WebServiceNlbLoadBalancingPort {
  /**
   * #### Public port exposed by the load balancer.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   tcpService:
   *     type: web-service
   *     properties:
   *       packaging:
   *         type: stacktape-image-buildpack
   *         properties:
   *           entryfilePath: src/main.ts
   *       resources:
   *         cpu: 1
   *         memory: 2048
   *       loadBalancing:
   *         type: network-load-balancer
   *         properties:
   *           ports:
   *             # stp-focus
   *             - port: 443
   *             # stp-end-focus
   *               containerPort: 8080
   *               protocol: TLS
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { defineConfig, WebService, StacktapeImageBuildpackPackaging } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const tcpService = new WebService({
   *     packaging: new StacktapeImageBuildpackPackaging({
   *       entryfilePath: 'src/main.ts'
   *     }),
   *     resources: {
   *       cpu: 1,
   *       memory: 2048
   *     },
   *     loadBalancing: {
   *       type: 'network-load-balancer',
   *       properties: {
   *         ports: [
   *           {
   *             // stp-focus
   *             port: 443,
   *             // stp-end-focus
   *             containerPort: 8080,
   *             protocol: 'TLS'
   *           }
   *         ]
   *       }
   *     }
   *   });
   *
   *   return {
   *     resources: { tcpService }
   *   };
   * });
   * ```
   */
  port: number;
  /**
   * #### Protocol: `TLS` (encrypted) or `TCP` (raw).
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   tcpService:
   *     type: web-service
   *     properties:
   *       packaging:
   *         type: stacktape-image-buildpack
   *         properties:
   *           entryfilePath: src/main.ts
   *       resources:
   *         cpu: 1
   *         memory: 2048
   *       loadBalancing:
   *         type: network-load-balancer
   *         properties:
   *           ports:
   *             - port: 8883
   *               containerPort: 1883
   *               # stp-focus
   *               protocol: TCP
   *               # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { defineConfig, WebService, StacktapeImageBuildpackPackaging } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const tcpService = new WebService({
   *     packaging: new StacktapeImageBuildpackPackaging({
   *       entryfilePath: 'src/main.ts'
   *     }),
   *     resources: {
   *       cpu: 1,
   *       memory: 2048
   *     },
   *     loadBalancing: {
   *       type: 'network-load-balancer',
   *       properties: {
   *         ports: [
   *           {
   *             port: 8883,
   *             containerPort: 1883,
   *             // stp-focus
   *             protocol: 'TCP'
   *             // stp-end-focus
   *           }
   *         ]
   *       }
   *     }
   *   });
   *
   *   return {
   *     resources: { tcpService }
   *   };
   * });
   * ```
   *
   * @default TLS
   */
  protocol?: 'TCP' | 'TLS';
  /**
   * #### Port on the container that receives the traffic. Defaults to `port`.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   tcpService:
   *     type: web-service
   *     properties:
   *       packaging:
   *         type: stacktape-image-buildpack
   *         properties:
   *           entryfilePath: src/main.ts
   *       resources:
   *         cpu: 1
   *         memory: 2048
   *       loadBalancing:
   *         type: network-load-balancer
   *         properties:
   *           ports:
   *             - port: 443
   *               protocol: TLS
   *               # stp-focus
   *               containerPort: 8080
   *               # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { defineConfig, WebService, StacktapeImageBuildpackPackaging } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const tcpService = new WebService({
   *     packaging: new StacktapeImageBuildpackPackaging({
   *       entryfilePath: 'src/main.ts'
   *     }),
   *     resources: {
   *       cpu: 1,
   *       memory: 2048
   *     },
   *     loadBalancing: {
   *       type: 'network-load-balancer',
   *       properties: {
   *         ports: [
   *           {
   *             port: 443,
   *             protocol: 'TLS',
   *             // stp-focus
   *             containerPort: 8080
   *             // stp-end-focus
   *           }
   *         ]
   *       }
   *     }
   *   });
   *
   *   return {
   *     resources: { tcpService }
   *   };
   * });
   * ```
   */
  containerPort?: number;
}
