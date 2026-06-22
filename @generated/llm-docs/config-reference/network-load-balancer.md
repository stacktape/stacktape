# Network Load Balancer

Resource type: `network-load-balancer`

## TypeScript Definition

```typescript
/**
 * #### TCP/TLS load balancer for non-HTTP traffic (MQTT, game servers, custom protocols).
 *
 * ---
 *
 * Handles millions of connections with ultra-low latency. Use when you need raw TCP/TLS
 * instead of HTTP routing. Does not support CDN, firewall, or gradual deployments.
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   gameTrafficLb:
 *     type: network-load-balancer
 *     properties:
 *       interface: internet
 *       listeners:
 *         - protocol: TCP
 *           port: 9000
 *
 *   gameServer:
 *     type: multi-container-workload
 *     properties:
 *       resources:
 *         cpu: 0.5
 *         memory: 1024
 *       containers:
 *         - name: udp-game-server
 *           packaging:
 *             type: stacktape-image-buildpack
 *             properties:
 *               entryfilePath: src/server.ts
 *           environment:
 *             - name: PORT
 *               value: 9000
 *           events:
 *             - type: network-load-balancer
 *               properties:
 *                 containerPort: 9000
 *                 loadBalancerName: gameTrafficLb
 *                 listenerPort: 9000
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { NetworkLoadBalancer, MultiContainerWorkload, defineConfig } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const gameTrafficLb = new NetworkLoadBalancer({
 *     interface: 'internet',
 *     listeners: [{ protocol: 'TCP', port: 9000 }]
 *   });
 *
 *   const gameServer = new MultiContainerWorkload({
 *     resources: { cpu: 0.5, memory: 1024 },
 *     containers: [
 *       {
 *         name: 'udp-game-server',
 *         packaging: { type: 'stacktape-image-buildpack', properties: { entryfilePath: 'src/server.ts' } },
 *         environment: { PORT: 9000 },
 *         events: [
 *           {
 *             type: 'network-load-balancer',
 *             properties: { containerPort: 9000, loadBalancerName: 'gameTrafficLb', listenerPort: 9000 }
 *           }
 *         ]
 *       }
 *     ]
 *   });
 *
 *   return { resources: { gameTrafficLb, gameServer } };
 * });
 * ```
 */
interface NetworkLoadBalancer {
  type: 'network-load-balancer';
  properties: NetworkLoadBalancerProps;
  overrides?: ResourceOverrides;
}

interface NetworkLoadBalancerProps {
  /**
   * #### `internet` (public) or `internal` (VPC-only).
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   internalMqttLb:
   *     type: network-load-balancer
   *     properties:
   *       interface: internal
   *       listeners:
   *         - protocol: TCP
   *           port: 1883
   *
   *   mqttBroker:
   *     type: multi-container-workload
   *     properties:
   *       resources:
   *         cpu: 0.25
   *         memory: 512
   *       containers:
   *         - name: broker
   *           packaging:
   *             type: stacktape-image-buildpack
   *             properties:
   *               entryfilePath: src/broker.ts
   *           environment:
   *             - name: PORT
   *               value: 1883
   *           events:
   *             - type: network-load-balancer
   *               properties:
   *                 containerPort: 1883
   *                 loadBalancerName: internalMqttLb
   *                 listenerPort: 1883
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { NetworkLoadBalancer, MultiContainerWorkload, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const internalMqttLb = new NetworkLoadBalancer({
   *     interface: 'internal',
   *     listeners: [{ protocol: 'TCP', port: 1883 }]
   *   });
   *
   *   const mqttBroker = new MultiContainerWorkload({
   *     resources: { cpu: 0.25, memory: 512 },
   *     containers: [
   *       {
   *         name: 'broker',
   *         packaging: { type: 'stacktape-image-buildpack', properties: { entryfilePath: 'src/broker.ts' } },
   *         environment: { PORT: 1883 },
   *         events: [
   *           {
   *             type: 'network-load-balancer',
   *             properties: { containerPort: 1883, loadBalancerName: 'internalMqttLb', listenerPort: 1883 }
   *           }
   *         ]
   *       }
   *     ]
   *   });
   *
   *   return { resources: { internalMqttLb, mqttBroker } };
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
   *   secureLb:
   *     type: network-load-balancer
   *     properties:
   *       customDomains:
   *         - domainName: mqtt.mydomain.com
   *         - domainName: legacy.mydomain.com
   *           disableDnsRecordCreation: true
   *       listeners:
   *         - protocol: TLS
   *           port: 8883
   *
   *   mqttBroker:
   *     type: multi-container-workload
   *     properties:
   *       resources:
   *         cpu: 0.5
   *         memory: 1024
   *       containers:
   *         - name: broker
   *           packaging:
   *             type: stacktape-image-buildpack
   *             properties:
   *               entryfilePath: src/broker.ts
   *           environment:
   *             - name: PORT
   *               value: 8883
   *           events:
   *             - type: network-load-balancer
   *               properties:
   *                 containerPort: 8883
   *                 loadBalancerName: secureLb
   *                 listenerPort: 8883
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { NetworkLoadBalancer, MultiContainerWorkload, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const secureLb = new NetworkLoadBalancer({
   *     customDomains: [
   *       { domainName: 'mqtt.mydomain.com' },
   *       { domainName: 'legacy.mydomain.com', disableDnsRecordCreation: true }
   *     ],
   *     listeners: [{ protocol: 'TLS', port: 8883 }]
   *   });
   *
   *   const mqttBroker = new MultiContainerWorkload({
   *     resources: { cpu: 0.5, memory: 1024 },
   *     containers: [
   *       {
   *         name: 'broker',
   *         packaging: { type: 'stacktape-image-buildpack', properties: { entryfilePath: 'src/broker.ts' } },
   *         environment: { PORT: 8883 },
   *         events: [
   *           {
   *             type: 'network-load-balancer',
   *             properties: { containerPort: 8883, loadBalancerName: 'secureLb', listenerPort: 8883 }
   *           }
   *         ]
   *       }
   *     ]
   *   });
   *
   *   return { resources: { secureLb, mqttBroker } };
   * });
   * ```
   */
  customDomains?: DomainConfiguration[] | string[];
  /**
   * #### Listeners define which ports and protocols (TCP/TLS) this load balancer accepts traffic on.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   multiPortLb:
   *     type: network-load-balancer
   *     properties:
   *       listeners:
   *         - protocol: TCP
   *           port: 9000
   *         - protocol: TCP
   *           port: 9001
   *
   *   gameServer:
   *     type: multi-container-workload
   *     properties:
   *       resources:
   *         cpu: 0.5
   *         memory: 1024
   *       containers:
   *         - name: game-server
   *           packaging:
   *             type: stacktape-image-buildpack
   *             properties:
   *               entryfilePath: src/server.ts
   *           environment:
   *             - name: GAME_PORT
   *               value: 9000
   *             - name: ADMIN_PORT
   *               value: 9001
   *           events:
   *             - type: network-load-balancer
   *               properties:
   *                 containerPort: 9000
   *                 loadBalancerName: multiPortLb
   *                 listenerPort: 9000
   *             - type: network-load-balancer
   *               properties:
   *                 containerPort: 9001
   *                 loadBalancerName: multiPortLb
   *                 listenerPort: 9001
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { NetworkLoadBalancer, MultiContainerWorkload, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const multiPortLb = new NetworkLoadBalancer({
   *     listeners: [
   *       { protocol: 'TCP', port: 9000 },
   *       { protocol: 'TCP', port: 9001 }
   *     ]
   *   });
   *
   *   const gameServer = new MultiContainerWorkload({
   *     resources: { cpu: 0.5, memory: 1024 },
   *     containers: [
   *       {
   *         name: 'game-server',
   *         packaging: { type: 'stacktape-image-buildpack', properties: { entryfilePath: 'src/server.ts' } },
   *         environment: { GAME_PORT: 9000, ADMIN_PORT: 9001 },
   *         events: [
   *           {
   *             type: 'network-load-balancer',
   *             properties: { containerPort: 9000, loadBalancerName: 'multiPortLb', listenerPort: 9000 }
   *           },
   *           {
   *             type: 'network-load-balancer',
   *             properties: { containerPort: 9001, loadBalancerName: 'multiPortLb', listenerPort: 9001 }
   *           }
   *         ]
   *       }
   *     ]
   *   });
   *
   *   return { resources: { multiPortLb, gameServer } };
   * });
   * ```
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

interface NetworkLoadBalancerListener {
  /**
   * #### `TCP` (raw) or `TLS` (encrypted). TLS requires a certificate (auto-created with `customDomains` or via `customCertificateArns`).
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   tlsLb:
   *     type: network-load-balancer
   *     properties:
   *       customDomains:
   *         - domainName: mqtt.mydomain.com
   *       listeners:
   *         - protocol: TLS
   *           port: 8883
   *
   *   mqttBroker:
   *     type: multi-container-workload
   *     properties:
   *       resources:
   *         cpu: 0.25
   *         memory: 512
   *       containers:
   *         - name: broker
   *           packaging:
   *             type: stacktape-image-buildpack
   *             properties:
   *               entryfilePath: src/broker.ts
   *           environment:
   *             - name: PORT
   *               value: 8883
   *           events:
   *             - type: network-load-balancer
   *               properties:
   *                 containerPort: 8883
   *                 loadBalancerName: tlsLb
   *                 listenerPort: 8883
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { NetworkLoadBalancer, MultiContainerWorkload, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const tlsLb = new NetworkLoadBalancer({
   *     customDomains: [{ domainName: 'mqtt.mydomain.com' }],
   *     listeners: [
   *       { protocol: 'TLS', port: 8883 }
   *     ]
   *   });
   *
   *   const mqttBroker = new MultiContainerWorkload({
   *     resources: { cpu: 0.25, memory: 512 },
   *     containers: [
   *       {
   *         name: 'broker',
   *         packaging: { type: 'stacktape-image-buildpack', properties: { entryfilePath: 'src/broker.ts' } },
   *         environment: { PORT: 8883 },
   *         events: [
   *           {
   *             type: 'network-load-balancer',
   *             properties: { containerPort: 8883, loadBalancerName: 'tlsLb', listenerPort: 8883 }
   *           }
   *         ]
   *       }
   *     ]
   *   });
   *
   *   return { resources: { tlsLb, mqttBroker } };
   * });
   * ```
   */
  protocol: 'TCP' | 'TLS';
  /**
   * #### Port this listener accepts traffic on.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   tcpLb:
   *     type: network-load-balancer
   *     properties:
   *       listeners:
   *         - protocol: TCP
   *           port: 7777
   *
   *   gameServer:
   *     type: multi-container-workload
   *     properties:
   *       resources:
   *         cpu: 0.5
   *         memory: 1024
   *       containers:
   *         - name: game-server
   *           packaging:
   *             type: stacktape-image-buildpack
   *             properties:
   *               entryfilePath: src/server.ts
   *           environment:
   *             - name: PORT
   *               value: 7777
   *           events:
   *             - type: network-load-balancer
   *               properties:
   *                 containerPort: 7777
   *                 loadBalancerName: tcpLb
   *                 listenerPort: 7777
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { NetworkLoadBalancer, MultiContainerWorkload, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const tcpLb = new NetworkLoadBalancer({
   *     listeners: [
   *       {
   *         protocol: 'TCP',
   *         port: 7777
   *       }
   *     ]
   *   });
   *
   *   const gameServer = new MultiContainerWorkload({
   *     resources: { cpu: 0.5, memory: 1024 },
   *     containers: [
   *       {
   *         name: 'game-server',
   *         packaging: { type: 'stacktape-image-buildpack', properties: { entryfilePath: 'src/server.ts' } },
   *         environment: { PORT: 7777 },
   *         events: [
   *           {
   *             type: 'network-load-balancer',
   *             properties: { containerPort: 7777, loadBalancerName: 'tcpLb', listenerPort: 7777 }
   *           }
   *         ]
   *       }
   *     ]
   *   });
   *
   *   return { resources: { tcpLb, gameServer } };
   * });
   * ```
   */
  port: number;
  /**
   * #### ARNs of your own ACM certificates. Not needed if using `customDomains` or TCP protocol.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   byoCertLb:
   *     type: network-load-balancer
   *     properties:
   *       listeners:
   *         - protocol: TLS
   *           port: 8883
   *           customCertificateArns:
   *             - arn:aws:acm:eu-west-1:123456789012:certificate/2b8f1c3e-4a5d-6e7f-8a9b-0c1d2e3f4a5b
   *
   *   mqttBroker:
   *     type: multi-container-workload
   *     properties:
   *       resources:
   *         cpu: 0.25
   *         memory: 512
   *       containers:
   *         - name: broker
   *           packaging:
   *             type: stacktape-image-buildpack
   *             properties:
   *               entryfilePath: src/broker.ts
   *           environment:
   *             - name: PORT
   *               value: 8883
   *           events:
   *             - type: network-load-balancer
   *               properties:
   *                 containerPort: 8883
   *                 loadBalancerName: byoCertLb
   *                 listenerPort: 8883
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { NetworkLoadBalancer, MultiContainerWorkload, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const byoCertLb = new NetworkLoadBalancer({
   *     listeners: [
   *       {
   *         protocol: 'TLS',
   *         port: 8883,
   *         customCertificateArns: [
   *           'arn:aws:acm:eu-west-1:123456789012:certificate/2b8f1c3e-4a5d-6e7f-8a9b-0c1d2e3f4a5b'
   *         ]
   *       }
   *     ]
   *   });
   *
   *   const mqttBroker = new MultiContainerWorkload({
   *     resources: { cpu: 0.25, memory: 512 },
   *     containers: [
   *       {
   *         name: 'broker',
   *         packaging: { type: 'stacktape-image-buildpack', properties: { entryfilePath: 'src/broker.ts' } },
   *         environment: { PORT: 8883 },
   *         events: [
   *           {
   *             type: 'network-load-balancer',
   *             properties: { containerPort: 8883, loadBalancerName: 'byoCertLb', listenerPort: 8883 }
   *           }
   *         ]
   *       }
   *     ]
   *   });
   *
   *   return { resources: { byoCertLb, mqttBroker } };
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
   *   restrictedLb:
   *     type: network-load-balancer
   *     properties:
   *       listeners:
   *         - protocol: TCP
   *           port: 5432
   *           whitelistIps:
   *             - 203.0.113.0/24
   *             - 198.51.100.42/32
   *
   *   tcpProxy:
   *     type: multi-container-workload
   *     properties:
   *       resources:
   *         cpu: 0.25
   *         memory: 512
   *       containers:
   *         - name: proxy
   *           packaging:
   *             type: stacktape-image-buildpack
   *             properties:
   *               entryfilePath: src/proxy.ts
   *           environment:
   *             - name: PORT
   *               value: 5432
   *           events:
   *             - type: network-load-balancer
   *               properties:
   *                 containerPort: 5432
   *                 loadBalancerName: restrictedLb
   *                 listenerPort: 5432
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { NetworkLoadBalancer, MultiContainerWorkload, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const restrictedLb = new NetworkLoadBalancer({
   *     listeners: [
   *       {
   *         protocol: 'TCP',
   *         port: 5432,
   *         whitelistIps: ['203.0.113.0/24', '198.51.100.42/32']
   *       }
   *     ]
   *   });
   *
   *   const tcpProxy = new MultiContainerWorkload({
   *     resources: { cpu: 0.25, memory: 512 },
   *     containers: [
   *       {
   *         name: 'proxy',
   *         packaging: { type: 'stacktape-image-buildpack', properties: { entryfilePath: 'src/proxy.ts' } },
   *         environment: { PORT: 5432 },
   *         events: [
   *           {
   *             type: 'network-load-balancer',
   *             properties: { containerPort: 5432, loadBalancerName: 'restrictedLb', listenerPort: 5432 }
   *           }
   *         ]
   *       }
   *     ]
   *   });
   *
   *   return { resources: { restrictedLb, tcpProxy } };
   * });
   * ```
   */
  whitelistIps?: string[];
}

interface StpResolvedNetworkLoadBalancerReference extends Omit<
  ContainerWorkloadNetworkLoadBalancerIntegrationProps,
  'loadBalancerName'
> {
  protocol: 'TCP' | 'TLS';
  loadBalancer: StpNetworkLoadBalancer;
  listenerPort: number;
  listenerHasCustomCerts?: boolean;
}
```
