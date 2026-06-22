# Application Load Balancer

Resource type: `application-load-balancer`

## TypeScript Definition

```typescript
/**
 * #### HTTP/HTTPS load balancer with flat ~$18/month pricing. Required for WebSockets, firewalls, and gradual deployments.
 *
 * ---
 *
 * Routes requests to containers or Lambda functions based on path, host, headers, or query params.
 * More cost-effective than API Gateway above ~500k requests/day. AWS Free Tier eligible.
 */
interface ApplicationLoadBalancer {
  type: 'application-load-balancer';
  properties?: ApplicationLoadBalancerProps;
  overrides?: ResourceOverrides;
}

interface ApplicationLoadBalancerProps {
  /**
   * #### `internet` (public) or `internal` (VPC-only). Internal ALBs are not reachable from the internet.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   webLoadBalancer:
   *     type: application-load-balancer
   *     properties:
   *       interface: internal
   *   apiFunction:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/index.ts
   *       events:
   *         - type: application-load-balancer
   *           properties:
   *             loadBalancerName: webLoadBalancer
   *             priority: 1
   *             paths:
   *               - /api/*
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { ApplicationLoadBalancer, LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const webLoadBalancer = new ApplicationLoadBalancer({
   *     interface: 'internal'
   *   });
   *
   *   const apiFunction = new LambdaFunction({
   *     packaging: {
   *       type: 'stacktape-lambda-buildpack',
   *       properties: { entryfilePath: 'src/index.ts' }
   *     },
   *     events: [
   *       {
   *         type: 'application-load-balancer',
   *         properties: {
   *           loadBalancerName: 'webLoadBalancer',
   *           priority: 1,
   *           paths: ['/api/*']
   *         }
   *       }
   *     ]
   *   });
   *
   *   return { resources: { webLoadBalancer, apiFunction } };
   * });
   * ```
   *
   * @default internet
   */
  interface?: 'internet' | 'internal';
  /**
   * #### Custom domains.
   *
   * ---
   *
   * By default, Stacktape creates DNS records and TLS certificates for each domain.
   * If you manage DNS yourself, set `disableDnsRecordCreation` and provide `customCertificateArn`.
   *
   * Backward compatible format `string[]` is still supported.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   webLoadBalancer:
   *     type: application-load-balancer
   *     properties:
   *       customDomains:
   *         - domainName: api.example.com
   *         - domainName: legacy.example.com
   *           disableDnsRecordCreation: true
   *   apiFunction:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/index.ts
   *       events:
   *         - type: application-load-balancer
   *           properties:
   *             loadBalancerName: webLoadBalancer
   *             priority: 1
   *             paths:
   *               - /*
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { ApplicationLoadBalancer, LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const webLoadBalancer = new ApplicationLoadBalancer({
   *     customDomains: [
   *       { domainName: 'api.example.com' },
   *       { domainName: 'legacy.example.com', disableDnsRecordCreation: true }
   *     ]
   *   });
   *
   *   const apiFunction = new LambdaFunction({
   *     packaging: {
   *       type: 'stacktape-lambda-buildpack',
   *       properties: { entryfilePath: 'src/index.ts' }
   *     },
   *     events: [
   *       {
   *         type: 'application-load-balancer',
   *         properties: {
   *           loadBalancerName: 'webLoadBalancer',
   *           priority: 1,
   *           paths: ['/*']
   *         }
   *       }
   *     ]
   *   });
   *
   *   return { resources: { webLoadBalancer, apiFunction } };
   * });
   * ```
   */
  customDomains?: DomainConfiguration[] | string[];
  /**
   * #### Custom listeners (port + protocol). Defaults to HTTPS on 443 + HTTP on 80 (redirecting to HTTPS).
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   webLoadBalancer:
   *     type: application-load-balancer
   *     properties:
   *       customDomains:
   *         - domainName: api.example.com
   *       listeners:
   *         - protocol: HTTPS
   *           port: 443
   *         - protocol: HTTP
   *           port: 8080
   *   apiFunction:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/index.ts
   *       events:
   *         - type: application-load-balancer
   *           properties:
   *             loadBalancerName: webLoadBalancer
   *             listenerPort: 443
   *             priority: 1
   *             paths:
   *               - /*
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { ApplicationLoadBalancer, LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const webLoadBalancer = new ApplicationLoadBalancer({
   *     customDomains: [{ domainName: 'api.example.com' }],
   *     listeners: [
   *       { protocol: 'HTTPS', port: 443 },
   *       { protocol: 'HTTP', port: 8080 }
   *     ]
   *   });
   *
   *   const apiFunction = new LambdaFunction({
   *     packaging: {
   *       type: 'stacktape-lambda-buildpack',
   *       properties: { entryfilePath: 'src/index.ts' }
   *     },
   *     events: [
   *       {
   *         type: 'application-load-balancer',
   *         properties: {
   *           loadBalancerName: 'webLoadBalancer',
   *           listenerPort: 443,
   *           priority: 1,
   *           paths: ['/*']
   *         }
   *       }
   *     ]
   *   });
   *
   *   return { resources: { webLoadBalancer, apiFunction } };
   * });
   * ```
   */
  listeners?: ApplicationLoadBalancerListener[];
  /**
   * #### Put a CDN (CloudFront) in front of this load balancer for caching and lower latency worldwide.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   webLoadBalancer:
   *     type: application-load-balancer
   *     properties:
   *       customDomains:
   *         - domainName: api.example.com
   *       cdn:
   *         enabled: true
   *         cloudfrontPriceClass: PriceClass_100
   *   apiFunction:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/index.ts
   *       events:
   *         - type: application-load-balancer
   *           properties:
   *             loadBalancerName: webLoadBalancer
   *             priority: 1
   *             paths:
   *               - /*
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { ApplicationLoadBalancer, LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const webLoadBalancer = new ApplicationLoadBalancer({
   *     customDomains: [{ domainName: 'api.example.com' }],
   *     cdn: {
   *       enabled: true,
   *       cloudfrontPriceClass: 'PriceClass_100'
   *     }
   *   });
   *
   *   const apiFunction = new LambdaFunction({
   *     packaging: {
   *       type: 'stacktape-lambda-buildpack',
   *       properties: { entryfilePath: 'src/index.ts' }
   *     },
   *     events: [
   *       {
   *         type: 'application-load-balancer',
   *         properties: {
   *           loadBalancerName: 'webLoadBalancer',
   *           priority: 1,
   *           paths: ['/*']
   *         }
   *       }
   *     ]
   *   });
   *
   *   return { resources: { webLoadBalancer, apiFunction } };
   * });
   * ```
   */
  cdn?: ApplicationLoadBalancerCdnConfiguration;
  /**
   * #### Alarms for this load balancer (merged with global alarms from the Stacktape Console).
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   webLoadBalancer:
   *     type: application-load-balancer
   *     properties:
   *       customDomains:
   *         - domainName: api.example.com
   *       alarms:
   *         - trigger:
   *             type: application-load-balancer-error-rate
   *             properties:
   *               thresholdPercent: 5
   *           notificationTargets:
   *             - type: email
   *               properties:
   *                 sender: alerts@example.com
   *                 recipient: oncall@example.com
   *         - trigger:
   *             type: application-load-balancer-unhealthy-targets
   *             properties:
   *               thresholdPercent: 20
   *   apiFunction:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/index.ts
   *       events:
   *         - type: application-load-balancer
   *           properties:
   *             loadBalancerName: webLoadBalancer
   *             priority: 1
   *             paths:
   *               - /*
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { ApplicationLoadBalancer, LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const webLoadBalancer = new ApplicationLoadBalancer({
   *     customDomains: [{ domainName: 'api.example.com' }],
   *     alarms: [
   *       {
   *         trigger: {
   *           type: 'application-load-balancer-error-rate',
   *           properties: { thresholdPercent: 5 }
   *         },
   *         notificationTargets: [
   *           {
   *             type: 'email',
   *             properties: { sender: 'alerts@example.com', recipient: 'oncall@example.com' }
   *           }
   *         ]
   *       },
   *       {
   *         trigger: {
   *           type: 'application-load-balancer-unhealthy-targets',
   *           properties: { thresholdPercent: 20 }
   *         }
   *       }
   *     ]
   *   });
   *
   *   const apiFunction = new LambdaFunction({
   *     packaging: {
   *       type: 'stacktape-lambda-buildpack',
   *       properties: { entryfilePath: 'src/index.ts' }
   *     },
   *     events: [
   *       {
   *         type: 'application-load-balancer',
   *         properties: {
   *           loadBalancerName: 'webLoadBalancer',
   *           priority: 1,
   *           paths: ['/*']
   *         }
   *       }
   *     ]
   *   });
   *
   *   return { resources: { webLoadBalancer, apiFunction } };
   * });
   * ```
   */
  alarms?: ApplicationLoadBalancerAlarm[];
  /**
   * #### Global alarm names to exclude from this load balancer.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   webLoadBalancer:
   *     type: application-load-balancer
   *     properties:
   *       customDomains:
   *         - domainName: api.example.com
   *       disabledGlobalAlarms:
   *         - high-error-rate
   *         - unhealthy-targets
   *   apiFunction:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/index.ts
   *       events:
   *         - type: application-load-balancer
   *           properties:
   *             loadBalancerName: webLoadBalancer
   *             priority: 1
   *             paths:
   *               - /*
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { ApplicationLoadBalancer, LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const webLoadBalancer = new ApplicationLoadBalancer({
   *     customDomains: [{ domainName: 'api.example.com' }],
   *     disabledGlobalAlarms: ['high-error-rate', 'unhealthy-targets']
   *   });
   *
   *   const apiFunction = new LambdaFunction({
   *     packaging: {
   *       type: 'stacktape-lambda-buildpack',
   *       properties: { entryfilePath: 'src/index.ts' }
   *     },
   *     events: [
   *       {
   *         type: 'application-load-balancer',
   *         properties: {
   *           loadBalancerName: 'webLoadBalancer',
   *           priority: 1,
   *           paths: ['/*']
   *         }
   *       }
   *     ]
   *   });
   *
   *   return { resources: { webLoadBalancer, apiFunction } };
   * });
   * ```
   */
  disabledGlobalAlarms?: string[];
  /**
   * #### Name of a `web-app-firewall` resource to protect this load balancer from common web exploits.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   apiFirewall:
   *     type: web-app-firewall
   *     properties:
   *       scope: regional
   *   webLoadBalancer:
   *     type: application-load-balancer
   *     properties:
   *       customDomains:
   *         - domainName: api.example.com
   *       useFirewall: apiFirewall
   *   apiFunction:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/index.ts
   *       events:
   *         - type: application-load-balancer
   *           properties:
   *             loadBalancerName: webLoadBalancer
   *             priority: 1
   *             paths:
   *               - /*
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { ApplicationLoadBalancer, LambdaFunction, WebAppFirewall, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const apiFirewall = new WebAppFirewall({ scope: 'regional' });
   *
   *   const webLoadBalancer = new ApplicationLoadBalancer({
   *     customDomains: [{ domainName: 'api.example.com' }],
   *     useFirewall: 'apiFirewall'
   *   });
   *
   *   const apiFunction = new LambdaFunction({
   *     packaging: {
   *       type: 'stacktape-lambda-buildpack',
   *       properties: { entryfilePath: 'src/index.ts' }
   *     },
   *     events: [
   *       {
   *         type: 'application-load-balancer',
   *         properties: {
   *           loadBalancerName: 'webLoadBalancer',
   *           priority: 1,
   *           paths: ['/*']
   *         }
   *       }
   *     ]
   *   });
   *
   *   return { resources: { apiFirewall, webLoadBalancer, apiFunction } };
   * });
   * ```
   */
  useFirewall?: string;
}

interface StpResolvedLoadBalancerReference extends Omit<
  ContainerWorkloadLoadBalancerIntegrationProps,
  'loadBalancerName'
> {
  protocol: 'HTTP' | 'HTTPS';
  loadBalancer: StpApplicationLoadBalancer;
  listenerPort: number;
  listenerHasCustomCerts?: boolean;
}

interface ApplicationLoadBalancerListener {
  /**
   * #### Listener protocol. `HTTPS` requires a TLS certificate (auto-created with `customDomains` or via `customCertificateArns`).
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   webLoadBalancer:
   *     type: application-load-balancer
   *     properties:
   *       customDomains:
   *         - domainName: api.example.com
   *       listeners:
   *         - protocol: HTTPS
   *           port: 443
   *   apiFunction:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/index.ts
   *       events:
   *         - type: application-load-balancer
   *           properties:
   *             loadBalancerName: webLoadBalancer
   *             listenerPort: 443
   *             priority: 1
   *             paths:
   *               - /*
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { ApplicationLoadBalancer, LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const webLoadBalancer = new ApplicationLoadBalancer({
   *     customDomains: [{ domainName: 'api.example.com' }],
   *     listeners: [
   *       { protocol: 'HTTPS', port: 443 }
   *     ]
   *   });
   *
   *   const apiFunction = new LambdaFunction({
   *     packaging: {
   *       type: 'stacktape-lambda-buildpack',
   *       properties: { entryfilePath: 'src/index.ts' }
   *     },
   *     events: [
   *       {
   *         type: 'application-load-balancer',
   *         properties: {
   *           loadBalancerName: 'webLoadBalancer',
   *           listenerPort: 443,
   *           priority: 1,
   *           paths: ['/*']
   *         }
   *       }
   *     ]
   *   });
   *
   *   return { resources: { webLoadBalancer, apiFunction } };
   * });
   * ```
   */
  protocol: 'HTTP' | 'HTTPS';
  /**
   * #### Port this listener accepts traffic on (e.g., 443 for HTTPS, 80 for HTTP).
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   webLoadBalancer:
   *     type: application-load-balancer
   *     properties:
   *       customDomains:
   *         - domainName: api.example.com
   *       listeners:
   *         - protocol: HTTPS
   *           port: 8443
   *   apiFunction:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/index.ts
   *       events:
   *         - type: application-load-balancer
   *           properties:
   *             loadBalancerName: webLoadBalancer
   *             listenerPort: 8443
   *             priority: 1
   *             paths:
   *               - /*
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { ApplicationLoadBalancer, LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const webLoadBalancer = new ApplicationLoadBalancer({
   *     customDomains: [{ domainName: 'api.example.com' }],
   *     listeners: [
   *       {
   *         protocol: 'HTTPS',
   *         port: 8443
   *       }
   *     ]
   *   });
   *
   *   const apiFunction = new LambdaFunction({
   *     packaging: {
   *       type: 'stacktape-lambda-buildpack',
   *       properties: { entryfilePath: 'src/index.ts' }
   *     },
   *     events: [
   *       {
   *         type: 'application-load-balancer',
   *         properties: {
   *           loadBalancerName: 'webLoadBalancer',
   *           listenerPort: 8443,
   *           priority: 1,
   *           paths: ['/*']
   *         }
   *       }
   *     ]
   *   });
   *
   *   return { resources: { webLoadBalancer, apiFunction } };
   * });
   * ```
   */
  port: number;
  /**
   * #### ARNs of your own ACM certificates. Not needed if using `customDomains` (Stacktape creates certs automatically).
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   webLoadBalancer:
   *     type: application-load-balancer
   *     properties:
   *       listeners:
   *         - protocol: HTTPS
   *           port: 443
   *           customCertificateArns:
   *             - arn:aws:acm:eu-west-1:123456789012:certificate/abcd1234-5678-90ef-ghij-klmnopqrstuv
   *   apiFunction:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/index.ts
   *       events:
   *         - type: application-load-balancer
   *           properties:
   *             loadBalancerName: webLoadBalancer
   *             listenerPort: 443
   *             priority: 1
   *             paths:
   *               - /*
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { ApplicationLoadBalancer, LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const webLoadBalancer = new ApplicationLoadBalancer({
   *     listeners: [
   *       {
   *         protocol: 'HTTPS',
   *         port: 443,
   *         customCertificateArns: [
   *           'arn:aws:acm:eu-west-1:123456789012:certificate/abcd1234-5678-90ef-ghij-klmnopqrstuv'
   *         ]
   *       }
   *     ]
   *   });
   *
   *   const apiFunction = new LambdaFunction({
   *     packaging: {
   *       type: 'stacktape-lambda-buildpack',
   *       properties: { entryfilePath: 'src/index.ts' }
   *     },
   *     events: [
   *       {
   *         type: 'application-load-balancer',
   *         properties: {
   *           loadBalancerName: 'webLoadBalancer',
   *           listenerPort: 443,
   *           priority: 1,
   *           paths: ['/*']
   *         }
   *       }
   *     ]
   *   });
   *
   *   return { resources: { webLoadBalancer, apiFunction } };
   * });
   * ```
   */
  customCertificateArns?: string[];
  /**
   * #### Restrict access to specific IP addresses/CIDRs. Default: all IPs allowed.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   webLoadBalancer:
   *     type: application-load-balancer
   *     properties:
   *       interface: internal
   *       listeners:
   *         - protocol: HTTP
   *           port: 80
   *           whitelistIps:
   *             - 10.0.0.0/8
   *             - 203.0.113.42/32
   *   apiFunction:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/index.ts
   *       events:
   *         - type: application-load-balancer
   *           properties:
   *             loadBalancerName: webLoadBalancer
   *             listenerPort: 80
   *             priority: 1
   *             paths:
   *               - /*
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { ApplicationLoadBalancer, LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const webLoadBalancer = new ApplicationLoadBalancer({
   *     interface: 'internal',
   *     listeners: [
   *       {
   *         protocol: 'HTTP',
   *         port: 80,
   *         whitelistIps: ['10.0.0.0/8', '203.0.113.42/32']
   *       }
   *     ]
   *   });
   *
   *   const apiFunction = new LambdaFunction({
   *     packaging: {
   *       type: 'stacktape-lambda-buildpack',
   *       properties: { entryfilePath: 'src/index.ts' }
   *     },
   *     events: [
   *       {
   *         type: 'application-load-balancer',
   *         properties: {
   *           loadBalancerName: 'webLoadBalancer',
   *           listenerPort: 80,
   *           priority: 1,
   *           paths: ['/*']
   *         }
   *       }
   *     ]
   *   });
   *
   *   return { resources: { webLoadBalancer, apiFunction } };
   * });
   * ```
   */
  whitelistIps?: string[];
  /**
   * #### Action for requests that don't match any integration. Currently supports `redirect` only.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   webLoadBalancer:
   *     type: application-load-balancer
   *     properties:
   *       customDomains:
   *         - domainName: api.example.com
   *       listeners:
   *         - protocol: HTTPS
   *           port: 443
   *         - protocol: HTTP
   *           port: 80
   *           defaultAction:
   *             type: redirect
   *             properties:
   *               protocol: HTTPS
   *               port: 443
   *               statusCode: HTTP_301
   *   apiFunction:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/index.ts
   *       events:
   *         - type: application-load-balancer
   *           properties:
   *             loadBalancerName: webLoadBalancer
   *             listenerPort: 443
   *             priority: 1
   *             paths:
   *               - /*
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { ApplicationLoadBalancer, LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const webLoadBalancer = new ApplicationLoadBalancer({
   *     customDomains: [{ domainName: 'api.example.com' }],
   *     listeners: [
   *       { protocol: 'HTTPS', port: 443 },
   *       {
   *         protocol: 'HTTP',
   *         port: 80,
   *         defaultAction: {
   *           type: 'redirect',
   *           properties: {
   *             protocol: 'HTTPS',
   *             port: 443,
   *             statusCode: 'HTTP_301'
   *           }
   *         }
   *       }
   *     ]
   *   });
   *
   *   const apiFunction = new LambdaFunction({
   *     packaging: {
   *       type: 'stacktape-lambda-buildpack',
   *       properties: { entryfilePath: 'src/index.ts' }
   *     },
   *     events: [
   *       {
   *         type: 'application-load-balancer',
   *         properties: {
   *           loadBalancerName: 'webLoadBalancer',
   *           listenerPort: 443,
   *           priority: 1,
   *           paths: ['/*']
   *         }
   *       }
   *     ]
   *   });
   *
   *   return { resources: { webLoadBalancer, apiFunction } };
   * });
   * ```
   */
  defaultAction?: LbRedirect;
}

interface LbRedirect {
  /**
   * #### The type of the default action.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   webLoadBalancer:
   *     type: application-load-balancer
   *     properties:
   *       customDomains:
   *         - domainName: api.example.com
   *       listeners:
   *         - protocol: HTTPS
   *           port: 443
   *         - protocol: HTTP
   *           port: 80
   *           defaultAction:
   *             type: redirect
   *             properties:
   *               protocol: HTTPS
   *               port: 443
   *               statusCode: HTTP_301
   *   apiFunction:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/index.ts
   *       events:
   *         - type: application-load-balancer
   *           properties:
   *             loadBalancerName: webLoadBalancer
   *             listenerPort: 443
   *             priority: 1
   *             paths:
   *               - /*
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { ApplicationLoadBalancer, LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const webLoadBalancer = new ApplicationLoadBalancer({
   *     customDomains: [{ domainName: 'api.example.com' }],
   *     listeners: [
   *       { protocol: 'HTTPS', port: 443 },
   *       {
   *         protocol: 'HTTP',
   *         port: 80,
   *         defaultAction: {
   *           type: 'redirect',
   *           properties: {
   *             protocol: 'HTTPS',
   *             port: 443,
   *             statusCode: 'HTTP_301'
   *           }
   *         }
   *       }
   *     ]
   *   });
   *
   *   const apiFunction = new LambdaFunction({
   *     packaging: {
   *       type: 'stacktape-lambda-buildpack',
   *       properties: { entryfilePath: 'src/index.ts' }
   *     },
   *     events: [
   *       {
   *         type: 'application-load-balancer',
   *         properties: {
   *           loadBalancerName: 'webLoadBalancer',
   *           listenerPort: 443,
   *           priority: 1,
   *           paths: ['/*']
   *         }
   *       }
   *     ]
   *   });
   *
   *   return { resources: { webLoadBalancer, apiFunction } };
   * });
   * ```
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
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   webLoadBalancer:
   *     type: application-load-balancer
   *     properties:
   *       customDomains:
   *         - domainName: example.com
   *         - domainName: www.example.com
   *       listeners:
   *         - protocol: HTTPS
   *           port: 443
   *           defaultAction:
   *             type: redirect
   *             properties:
   *               host: www.example.com
   *               path: /#{path}
   *               query: '#{query}'
   *               statusCode: HTTP_301
   *   apiFunction:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/index.ts
   *       events:
   *         - type: application-load-balancer
   *           properties:
   *             loadBalancerName: webLoadBalancer
   *             listenerPort: 443
   *             priority: 1
   *             hosts:
   *               - www.example.com
   *             paths:
   *               - /*
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { ApplicationLoadBalancer, LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const webLoadBalancer = new ApplicationLoadBalancer({
   *     customDomains: [{ domainName: 'example.com' }, { domainName: 'www.example.com' }],
   *     listeners: [
   *       {
   *         protocol: 'HTTPS',
   *         port: 443,
   *         defaultAction: {
   *           type: 'redirect',
   *           properties: {
   *             host: 'www.example.com',
   *             path: '/#{path}',
   *             query: '#{query}',
   *             statusCode: 'HTTP_301'
   *           }
   *         }
   *       }
   *     ]
   *   });
   *
   *   const apiFunction = new LambdaFunction({
   *     packaging: {
   *       type: 'stacktape-lambda-buildpack',
   *       properties: { entryfilePath: 'src/index.ts' }
   *     },
   *     events: [
   *       {
   *         type: 'application-load-balancer',
   *         properties: {
   *           loadBalancerName: 'webLoadBalancer',
   *           listenerPort: 443,
   *           priority: 1,
   *           hosts: ['www.example.com'],
   *           paths: ['/*']
   *         }
   *       }
   *     ]
   *   });
   *
   *   return { resources: { webLoadBalancer, apiFunction } };
   * });
   * ```
   */
  properties: LbRedirectProperties;
}

interface LbRedirectProperties {
  /**
   * #### Redirect path (must start with `/`). Use `#{path}` to reuse the original path.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   webLoadBalancer:
   *     type: application-load-balancer
   *     properties:
   *       customDomains:
   *         - domainName: example.com
   *       listeners:
   *         - protocol: HTTPS
   *           port: 443
   *           defaultAction:
   *             type: redirect
   *             properties:
   *               path: /new/#{path}
   *               statusCode: HTTP_301
   *   apiFunction:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/index.ts
   *       events:
   *         - type: application-load-balancer
   *           properties:
   *             loadBalancerName: webLoadBalancer
   *             listenerPort: 443
   *             priority: 1
   *             paths:
   *               - /new/*
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { ApplicationLoadBalancer, LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const webLoadBalancer = new ApplicationLoadBalancer({
   *     customDomains: [{ domainName: 'example.com' }],
   *     listeners: [
   *       {
   *         protocol: 'HTTPS',
   *         port: 443,
   *         defaultAction: {
   *           type: 'redirect',
   *           properties: {
   *             path: '/new/#{path}',
   *             statusCode: 'HTTP_301'
   *           }
   *         }
   *       }
   *     ]
   *   });
   *
   *   const apiFunction = new LambdaFunction({
   *     packaging: {
   *       type: 'stacktape-lambda-buildpack',
   *       properties: { entryfilePath: 'src/index.ts' }
   *     },
   *     events: [
   *       {
   *         type: 'application-load-balancer',
   *         properties: {
   *           loadBalancerName: 'webLoadBalancer',
   *           listenerPort: 443,
   *           priority: 1,
   *           paths: ['/new/*']
   *         }
   *       }
   *     ]
   *   });
   *
   *   return { resources: { webLoadBalancer, apiFunction } };
   * });
   * ```
   */
  path?: string;
  /**
   * #### Query string for the redirect (without leading `?`). Use `#{query}` to preserve the original.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   webLoadBalancer:
   *     type: application-load-balancer
   *     properties:
   *       customDomains:
   *         - domainName: example.com
   *       listeners:
   *         - protocol: HTTPS
   *           port: 443
   *           defaultAction:
   *             type: redirect
   *             properties:
   *               query: '#{query}&source=redirect'
   *               statusCode: HTTP_302
   *   apiFunction:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/index.ts
   *       events:
   *         - type: application-load-balancer
   *           properties:
   *             loadBalancerName: webLoadBalancer
   *             listenerPort: 443
   *             priority: 1
   *             paths:
   *               - /*
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { ApplicationLoadBalancer, LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const webLoadBalancer = new ApplicationLoadBalancer({
   *     customDomains: [{ domainName: 'example.com' }],
   *     listeners: [
   *       {
   *         protocol: 'HTTPS',
   *         port: 443,
   *         defaultAction: {
   *           type: 'redirect',
   *           properties: {
   *             query: '#{query}&source=redirect',
   *             statusCode: 'HTTP_302'
   *           }
   *         }
   *       }
   *     ]
   *   });
   *
   *   const apiFunction = new LambdaFunction({
   *     packaging: {
   *       type: 'stacktape-lambda-buildpack',
   *       properties: { entryfilePath: 'src/index.ts' }
   *     },
   *     events: [
   *       {
   *         type: 'application-load-balancer',
   *         properties: {
   *           loadBalancerName: 'webLoadBalancer',
   *           listenerPort: 443,
   *           priority: 1,
   *           paths: ['/*']
   *         }
   *       }
   *     ]
   *   });
   *
   *   return { resources: { webLoadBalancer, apiFunction } };
   * });
   * ```
   */
  query?: string;
  /**
   * #### Redirect port (1-65535). Use `#{port}` to keep the original.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   webLoadBalancer:
   *     type: application-load-balancer
   *     properties:
   *       customDomains:
   *         - domainName: example.com
   *       listeners:
   *         - protocol: HTTPS
   *           port: 443
   *         - protocol: HTTP
   *           port: 80
   *           defaultAction:
   *             type: redirect
   *             properties:
   *               protocol: HTTPS
   *               port: 443
   *               statusCode: HTTP_301
   *   apiFunction:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/index.ts
   *       events:
   *         - type: application-load-balancer
   *           properties:
   *             loadBalancerName: webLoadBalancer
   *             listenerPort: 443
   *             priority: 1
   *             paths:
   *               - /*
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { ApplicationLoadBalancer, LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const webLoadBalancer = new ApplicationLoadBalancer({
   *     customDomains: [{ domainName: 'example.com' }],
   *     listeners: [
   *       { protocol: 'HTTPS', port: 443 },
   *       {
   *         protocol: 'HTTP',
   *         port: 80,
   *         defaultAction: {
   *           type: 'redirect',
   *           properties: {
   *             protocol: 'HTTPS',
   *             port: 443,
   *             statusCode: 'HTTP_301'
   *           }
   *         }
   *       }
   *     ]
   *   });
   *
   *   const apiFunction = new LambdaFunction({
   *     packaging: {
   *       type: 'stacktape-lambda-buildpack',
   *       properties: { entryfilePath: 'src/index.ts' }
   *     },
   *     events: [
   *       {
   *         type: 'application-load-balancer',
   *         properties: {
   *           loadBalancerName: 'webLoadBalancer',
   *           listenerPort: 443,
   *           priority: 1,
   *           paths: ['/*']
   *         }
   *       }
   *     ]
   *   });
   *
   *   return { resources: { webLoadBalancer, apiFunction } };
   * });
   * ```
   */
  port?: number;
  /**
   * #### Redirect hostname. Use `#{host}` to keep the original.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   webLoadBalancer:
   *     type: application-load-balancer
   *     properties:
   *       customDomains:
   *         - domainName: old.example.com
   *         - domainName: new.example.com
   *       listeners:
   *         - protocol: HTTPS
   *           port: 443
   *           defaultAction:
   *             type: redirect
   *             properties:
   *               host: new.example.com
   *               statusCode: HTTP_301
   *   apiFunction:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/index.ts
   *       events:
   *         - type: application-load-balancer
   *           properties:
   *             loadBalancerName: webLoadBalancer
   *             listenerPort: 443
   *             priority: 1
   *             hosts:
   *               - new.example.com
   *             paths:
   *               - /*
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { ApplicationLoadBalancer, LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const webLoadBalancer = new ApplicationLoadBalancer({
   *     customDomains: [{ domainName: 'old.example.com' }, { domainName: 'new.example.com' }],
   *     listeners: [
   *       {
   *         protocol: 'HTTPS',
   *         port: 443,
   *         defaultAction: {
   *           type: 'redirect',
   *           properties: {
   *             host: 'new.example.com',
   *             statusCode: 'HTTP_301'
   *           }
   *         }
   *       }
   *     ]
   *   });
   *
   *   const apiFunction = new LambdaFunction({
   *     packaging: {
   *       type: 'stacktape-lambda-buildpack',
   *       properties: { entryfilePath: 'src/index.ts' }
   *     },
   *     events: [
   *       {
   *         type: 'application-load-balancer',
   *         properties: {
   *           loadBalancerName: 'webLoadBalancer',
   *           listenerPort: 443,
   *           priority: 1,
   *           hosts: ['new.example.com'],
   *           paths: ['/*']
   *         }
   *       }
   *     ]
   *   });
   *
   *   return { resources: { webLoadBalancer, apiFunction } };
   * });
   * ```
   */
  host?: string;
  /**
   * #### Redirect protocol. Cannot redirect HTTPS to HTTP.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   webLoadBalancer:
   *     type: application-load-balancer
   *     properties:
   *       customDomains:
   *         - domainName: example.com
   *       listeners:
   *         - protocol: HTTPS
   *           port: 443
   *         - protocol: HTTP
   *           port: 80
   *           defaultAction:
   *             type: redirect
   *             properties:
   *               protocol: HTTPS
   *               port: 443
   *               statusCode: HTTP_301
   *   apiFunction:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/index.ts
   *       events:
   *         - type: application-load-balancer
   *           properties:
   *             loadBalancerName: webLoadBalancer
   *             listenerPort: 443
   *             priority: 1
   *             paths:
   *               - /*
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { ApplicationLoadBalancer, LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const webLoadBalancer = new ApplicationLoadBalancer({
   *     customDomains: [{ domainName: 'example.com' }],
   *     listeners: [
   *       { protocol: 'HTTPS', port: 443 },
   *       {
   *         protocol: 'HTTP',
   *         port: 80,
   *         defaultAction: {
   *           type: 'redirect',
   *           properties: {
   *             protocol: 'HTTPS',
   *             port: 443,
   *             statusCode: 'HTTP_301'
   *           }
   *         }
   *       }
   *     ]
   *   });
   *
   *   const apiFunction = new LambdaFunction({
   *     packaging: {
   *       type: 'stacktape-lambda-buildpack',
   *       properties: { entryfilePath: 'src/index.ts' }
   *     },
   *     events: [
   *       {
   *         type: 'application-load-balancer',
   *         properties: {
   *           loadBalancerName: 'webLoadBalancer',
   *           listenerPort: 443,
   *           priority: 1,
   *           paths: ['/*']
   *         }
   *       }
   *     ]
   *   });
   *
   *   return { resources: { webLoadBalancer, apiFunction } };
   * });
   * ```
   */
  protocol?: 'HTTP' | 'HTTPS';
  /**
   * #### `HTTP_301` (permanent) or `HTTP_302` (temporary) redirect.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   webLoadBalancer:
   *     type: application-load-balancer
   *     properties:
   *       customDomains:
   *         - domainName: example.com
   *       listeners:
   *         - protocol: HTTPS
   *           port: 443
   *         - protocol: HTTP
   *           port: 80
   *           defaultAction:
   *             type: redirect
   *             properties:
   *               protocol: HTTPS
   *               port: 443
   *               statusCode: HTTP_301
   *   apiFunction:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/index.ts
   *       events:
   *         - type: application-load-balancer
   *           properties:
   *             loadBalancerName: webLoadBalancer
   *             listenerPort: 443
   *             priority: 1
   *             paths:
   *               - /*
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { ApplicationLoadBalancer, LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const webLoadBalancer = new ApplicationLoadBalancer({
   *     customDomains: [{ domainName: 'example.com' }],
   *     listeners: [
   *       { protocol: 'HTTPS', port: 443 },
   *       {
   *         protocol: 'HTTP',
   *         port: 80,
   *         defaultAction: {
   *           type: 'redirect',
   *           properties: {
   *             protocol: 'HTTPS',
   *             port: 443,
   *             statusCode: 'HTTP_301'
   *           }
   *         }
   *       }
   *     ]
   *   });
   *
   *   const apiFunction = new LambdaFunction({
   *     packaging: {
   *       type: 'stacktape-lambda-buildpack',
   *       properties: { entryfilePath: 'src/index.ts' }
   *     },
   *     events: [
   *       {
   *         type: 'application-load-balancer',
   *         properties: {
   *           loadBalancerName: 'webLoadBalancer',
   *           listenerPort: 443,
   *           priority: 1,
   *           paths: ['/*']
   *         }
   *       }
   *     ]
   *   });
   *
   *   return { resources: { webLoadBalancer, apiFunction } };
   * });
   * ```
   */
  statusCode: 'HTTP_301' | 'HTTP_302';
}
interface ApplicationLoadBalancerCdnConfiguration extends CdnConfiguration {
  /**
   * #### Listener port for CDN traffic. Only needed if using custom listeners.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   webLoadBalancer:
   *     type: application-load-balancer
   *     properties:
   *       customDomains:
   *         - domainName: api.example.com
   *       listeners:
   *         - protocol: HTTPS
   *           port: 8443
   *       cdn:
   *         enabled: true
   *         listenerPort: 8443
   *   apiFunction:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/index.ts
   *       events:
   *         - type: application-load-balancer
   *           properties:
   *             loadBalancerName: webLoadBalancer
   *             listenerPort: 8443
   *             priority: 1
   *             paths:
   *               - /*
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { ApplicationLoadBalancer, LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const webLoadBalancer = new ApplicationLoadBalancer({
   *     customDomains: [{ domainName: 'api.example.com' }],
   *     listeners: [{ protocol: 'HTTPS', port: 8443 }],
   *     cdn: {
   *       enabled: true,
   *       listenerPort: 8443
   *     }
   *   });
   *
   *   const apiFunction = new LambdaFunction({
   *     packaging: {
   *       type: 'stacktape-lambda-buildpack',
   *       properties: { entryfilePath: 'src/index.ts' }
   *     },
   *     events: [
   *       {
   *         type: 'application-load-balancer',
   *         properties: {
   *           loadBalancerName: 'webLoadBalancer',
   *           listenerPort: 8443,
   *           priority: 1,
   *           paths: ['/*']
   *         }
   *       }
   *     ]
   *   });
   *
   *   return { resources: { webLoadBalancer, apiFunction } };
   * });
   * ```
   */
  listenerPort?: number;
  /**
   * #### Explicit origin domain. Only needed if the ALB has no `customDomains` and uses `customCertificateArns`.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   webLoadBalancer:
   *     type: application-load-balancer
   *     properties:
   *       listeners:
   *         - protocol: HTTPS
   *           port: 443
   *           customCertificateArns:
   *             - arn:aws:acm:eu-west-1:123456789012:certificate/abcd1234-5678-90ef-ghij-klmnopqrstuv
   *       cdn:
   *         enabled: true
   *         originDomainName: alb.internal.example.com
   *   apiFunction:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/index.ts
   *       events:
   *         - type: application-load-balancer
   *           properties:
   *             loadBalancerName: webLoadBalancer
   *             listenerPort: 443
   *             priority: 1
   *             paths:
   *               - /*
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { ApplicationLoadBalancer, LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const webLoadBalancer = new ApplicationLoadBalancer({
   *     listeners: [
   *       {
   *         protocol: 'HTTPS',
   *         port: 443,
   *         customCertificateArns: [
   *           'arn:aws:acm:eu-west-1:123456789012:certificate/abcd1234-5678-90ef-ghij-klmnopqrstuv'
   *         ]
   *       }
   *     ],
   *     cdn: {
   *       enabled: true,
   *       originDomainName: 'alb.internal.example.com'
   *     }
   *   });
   *
   *   const apiFunction = new LambdaFunction({
   *     packaging: {
   *       type: 'stacktape-lambda-buildpack',
   *       properties: { entryfilePath: 'src/index.ts' }
   *     },
   *     events: [
   *       {
   *         type: 'application-load-balancer',
   *         properties: {
   *           loadBalancerName: 'webLoadBalancer',
   *           listenerPort: 443,
   *           priority: 1,
   *           paths: ['/*']
   *         }
   *       }
   *     ]
   *   });
   *
   *   return { resources: { webLoadBalancer, apiFunction } };
   * });
   * ```
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
```
