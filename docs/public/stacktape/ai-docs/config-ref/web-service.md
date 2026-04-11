---
docType: config-ref
title: Web Service
resourceType: web-service
tags:
  - web-service
  - container
  - docker
  - ecs
  - fargate
  - http-service
source: types/stacktape-config/web-services.d.ts
priority: 1
---

# Web Service

A container running 24/7 with a public HTTPS URL.

Use for APIs, web apps, and any service that needs to be always-on and reachable from the internet.
Includes TLS/SSL, auto-scaling, health checks, and zero-downtime deployments.

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
   */
  cors?: HttpApiCorsConfig;
  /**
   * #### Custom domains (e.g., `api.example.com`). Stacktape auto-creates DNS records and TLS certificates.
   *
   * ---
   *
   * Your domain must be added as a Route53 hosted zone in your AWS account first.
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
   *   (`deployment`), firewalls (`useFirewall`), and WebSocket support.
   *   More cost-effective above ~500k requests/day. AWS Free Tier eligible.
   *
   * - **`network-load-balancer`**: For non-HTTP traffic (TCP/TLS) like MQTT, game servers, or custom protocols.
   *   Requires explicit `ports` configuration. Does not support CDN, firewall, or gradual deployments.
   */
  loadBalancing?: WebServiceHttpApiGatewayLoadBalancing | WebServiceAlbLoadBalancing | WebServiceNlbLoadBalancing;
  /**
   * #### Put a CDN (CloudFront) in front of this service for caching and lower latency worldwide.
   */
  cdn?: CdnConfiguration;
  /**
   * #### Alarms for this service (merged with global alarms from the Stacktape Console).
   */
  alarms?: (HttpApiGatewayAlarm | ApplicationLoadBalancerAlarm)[];
  /**
   * #### Global alarm names to exclude from this service.
   */
  disabledGlobalAlarms?: string[];
  /**
   * #### Gradual traffic shifting for safe deployments (canary, linear, or all-at-once).
   *
   * ---
   *
   * Requires `loadBalancing` type `application-load-balancer`.
   */
  deployment?: ContainerWorkloadDeploymentConfig;
  /**
   * #### Name of a `web-app-firewall` resource to protect this service from common web exploits.
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
   * @default /
   */
  healthcheckPath?: string;
  /**
   * #### Seconds between health checks.
   * @default 5
   */
  healthcheckInterval?: number;
  /**
   * #### Seconds before a health check is considered failed.
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
   * @default /
   */
  healthcheckPath?: string;
  /**
   * #### Seconds between health checks (5-300).
   * @default 5
   */
  healthcheckInterval?: number;
  /**
   * #### Seconds before a health check is considered failed (2-120).
   * @default 4
   */
  healthcheckTimeout?: number;
  /**
   * #### Health check protocol: `TCP` (port check) or `HTTP` (path check).
   * @default TCP
   */
  healthCheckProtocol?: 'HTTP' | 'TCP';
  /**
   * #### Health check port. Defaults to the traffic port.
   */
  healthCheckPort?: number;
  ports: WebServiceNlbLoadBalancingPort[];
}

interface WebServiceNlbLoadBalancingPort {
  /**
   * #### Public port exposed by the load balancer.
   */
  port: number;
  /**
   * #### Protocol: `TLS` (encrypted) or `TCP` (raw).
   * @default TLS
   */
  protocol?: 'TCP' | 'TLS';
  /**
   * #### Port on the container that receives the traffic. Defaults to `port`.
   */
  containerPort?: number;
}
```
