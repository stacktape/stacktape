# Web Service

Resource type: `web-service`

## TypeScript Definition

```typescript
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
   *       cors:
   *         enabled: true
   *         allowedOrigins:
   *           - https://app.example.com
   *         allowedMethods:
   *           - GET
   *           - POST
   *         allowCredentials: true
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
   *     cors: {
   *       enabled: true,
   *       allowedOrigins: ['https://app.example.com'],
   *       allowedMethods: ['GET', 'POST'],
   *       allowCredentials: true
   *     }
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
   *       customDomains:
   *         - domainName: api.example.com
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
   *     customDomains: [{ domainName: 'api.example.com' }]
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
   *       loadBalancing:
   *         type: application-load-balancer
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
   *     }
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
   *       cdn:
   *         enabled: true
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
   *     cdn: {
   *       enabled: true
   *     }
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
   *       disabledGlobalAlarms:
   *         - high-error-rate
   *         - high-latency
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
   *     disabledGlobalAlarms: ['high-error-rate', 'high-latency']
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
   *       deployment:
   *         strategy: Canary10Percent5Minutes
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
   *     deployment: {
   *       strategy: 'Canary10Percent5Minutes'
   *     }
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
   *       useFirewall: serviceFirewall
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
   *     useFirewall: 'serviceFirewall'
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
   *           healthcheckPath: /health
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
   *         healthcheckPath: '/health'
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
   *           healthcheckInterval: 10
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
   *         healthcheckInterval: 10
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
   *           healthcheckTimeout: 5
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
   *         healthcheckTimeout: 5
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
   *         healthCheckProtocol: 'HTTP',
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
   *           healthcheckInterval: 30
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
   *           healthcheckTimeout: 10
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
   *         healthcheckTimeout: 10,
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
   *           healthCheckProtocol: HTTP
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
   *         healthCheckProtocol: 'HTTP',
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
   *           healthCheckPort: 8081
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
   *         healthCheckPort: 8081,
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
   *         ports: [
   *           {
   *             port: 443,
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
   *               protocol: TCP
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
   *             protocol: 'TCP'
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
   *               containerPort: 8080
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
   *             containerPort: 8080
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
```
