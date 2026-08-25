import type { SupportedAWSRegion } from './aws-regions';
import type { NotificationChannel } from './notification-channels';
import type { ResourceOverrides } from './shared';

export interface UptimeCheck {
  type: 'uptime-check';
  properties: UptimeCheckProps;
  overrides?: ResourceOverrides;
}


export interface UptimeCheckProps {
  /**
   * #### The URL to monitor.
   *
   * ---
   *
   * The check periodically sends an HTTP request to this URL from multiple AWS regions and alerts you when it
   * stops responding successfully. Use a literal URL, or reference a deployed resource's URL with
   * `$ResourceParam()`.
   *
   * Must be a publicly reachable `https://` or `http://` URL. Monitoring of VPC-internal endpoints is not
   * supported yet.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   api:
   *     type: web-service
   *     properties:
   *       packaging:
   *         type: stacktape-image-buildpack
   *         properties:
   *           entryfilePath: src/server.ts
   *       resources:
   *         cpu: 0.25
   *         memory: 512
   *
   *   apiHealth:
   *     type: uptime-check
   *     properties:
   *       # stp-focus
   *       url: $ResourceParam('api', 'url')
   *       # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { UptimeCheck, WebService, defineConfig, $ResourceParam } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const api = new WebService({
   *     packaging: {
   *       type: 'stacktape-image-buildpack',
   *       properties: { entryfilePath: 'src/server.ts' }
   *     },
   *     resources: { cpu: 0.25, memory: 512 }
   *   });
   *
   *   const apiHealth = new UptimeCheck({
   *     // stp-focus
   *     url: $ResourceParam('api', 'url'),
   *     // stp-end-focus
   *   });
   *
   *   return { resources: { api, apiHealth } };
   * });
   * ```
   */
  url: string;
  /**
   * #### HTTP method used for the probe.
   *
   * ---
   *
   * `HEAD` is cheaper for endpoints that support it (no response body is transferred), but `body-contains`
   * assertions require `GET`.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   homepage:
   *     type: uptime-check
   *     properties:
   *       url: https://example.com
   *       # stp-focus
   *       method: HEAD
   *       # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { UptimeCheck, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const homepage = new UptimeCheck({
   *     url: 'https://example.com',
   *     // stp-focus
   *     method: 'HEAD'
   *     // stp-end-focus
   *   });
   *   return { resources: { homepage } };
   * });
   * ```
   *
   * @default GET
   */
  method?: 'GET' | 'HEAD';
  /**
   * #### How often each monitoring region probes the URL, in seconds.
   *
   * ---
   *
   * With the default 3 monitoring regions, an interval of `60` means the endpoint is probed 3 times per
   * minute in total (once per region).
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   apiHealth:
   *     type: uptime-check
   *     properties:
   *       url: https://api.example.com/health
   *       # stp-focus
   *       intervalSeconds: 30
   *       # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { UptimeCheck, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const apiHealth = new UptimeCheck({
   *     url: 'https://api.example.com/health',
   *     // stp-focus
   *     intervalSeconds: 30
   *     // stp-end-focus
   *   });
   *   return { resources: { apiHealth } };
   * });
   * ```
   *
   * @default 60
   */
  intervalSeconds?: 30 | 60;
  /**
   * #### How long to wait for a response before the probe counts as failed, in seconds.
   *
   * ---
   *
   * Allowed range: 1 to 30.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   apiHealth:
   *     type: uptime-check
   *     properties:
   *       url: https://api.example.com/health
   *       # stp-focus
   *       timeoutSeconds: 5
   *       # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { UptimeCheck, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const apiHealth = new UptimeCheck({
   *     url: 'https://api.example.com/health',
   *     // stp-focus
   *     timeoutSeconds: 5
   *     // stp-end-focus
   *   });
   *   return { resources: { apiHealth } };
   * });
   * ```
   *
   * @default 10
   */
  timeoutSeconds?: number;
  /**
   * #### Whether the probe follows HTTP redirects (up to 5).
   *
   * ---
   *
   * When disabled, a `3xx` response is evaluated directly against your assertions.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   wwwRedirect:
   *     type: uptime-check
   *     properties:
   *       url: https://example.com
   *       # stp-focus
   *       followRedirects: false
   *       # stp-end-focus
   *       assertions:
   *         - type: status-code
   *           properties:
   *             accepted: [301]
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { UptimeCheck, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const wwwRedirect = new UptimeCheck({
   *     url: 'https://example.com',
   *     // stp-focus
   *     followRedirects: false,
   *     // stp-end-focus
   *     assertions: [{ type: 'status-code', properties: { accepted: [301] } }]
   *   });
   *   return { resources: { wwwRedirect } };
   * });
   * ```
   *
   * @default true
   */
  followRedirects?: boolean;
  /**
   * #### Conditions the response must meet for the probe to count as successful.
   *
   * ---
   *
   * When omitted, any `2xx` or `3xx` status code counts as up. All listed assertions must pass.
   *
   * TLS certificate expiry is tracked automatically on every `https://` check — you get a warning when the
   * certificate is about to expire, without configuring anything.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   apiHealth:
   *     type: uptime-check
   *     properties:
   *       url: https://api.example.com/health
   *       # stp-focus
   *       assertions:
   *         - type: status-code
   *           properties:
   *             accepted: [200]
   *         - type: body-contains
   *           properties:
   *             value: '"status":"ok"'
   *       # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { UptimeCheck, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const apiHealth = new UptimeCheck({
   *     url: 'https://api.example.com/health',
   *     // stp-focus
   *     assertions: [
   *       { type: 'status-code', properties: { accepted: [200] } },
   *       { type: 'body-contains', properties: { value: '"status":"ok"' } }
   *     ]
   *     // stp-end-focus
   *   });
   *   return { resources: { apiHealth } };
   * });
   * ```
   */
  assertions?: UptimeCheckAssertion[];
  /**
   * #### How many consecutive failed or successful evaluations flip the check between up and down.
   *
   * ---
   *
   * Failures must be confirmed by multiple monitoring regions within the same evaluation window before the
   * check is considered down — a blip in a single region never pages you.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   apiHealth:
   *     type: uptime-check
   *     properties:
   *       url: https://api.example.com/health
   *       # stp-focus
   *       evaluation:
   *         consecutiveFailures: 3
   *         consecutiveSuccesses: 2
   *       # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { UptimeCheck, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const apiHealth = new UptimeCheck({
   *     url: 'https://api.example.com/health',
   *     // stp-focus
   *     evaluation: { consecutiveFailures: 3, consecutiveSuccesses: 2 }
   *     // stp-end-focus
   *   });
   *   return { resources: { apiHealth } };
   * });
   * ```
   */
  evaluation?: UptimeCheckEvaluation;
  /**
   * #### AWS regions the URL is probed from.
   *
   * ---
   *
   * Probes run from lightweight monitoring functions in these regions of your own AWS account. Using multiple
   * distant regions gives you an outside view per geography and prevents a single region's network blip from
   * triggering a false alert.
   *
   * When omitted, the check runs from the stack's region plus two distant regions.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   apiHealth:
   *     type: uptime-check
   *     properties:
   *       url: https://api.example.com/health
   *       # stp-focus
   *       regions:
   *         - eu-west-1
   *         - us-east-1
   *         - ap-southeast-1
   *       # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { UptimeCheck, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const apiHealth = new UptimeCheck({
   *     url: 'https://api.example.com/health',
   *     // stp-focus
   *     regions: ['eu-west-1', 'us-east-1', 'ap-southeast-1']
   *     // stp-end-focus
   *   });
   *   return { resources: { apiHealth } };
   * });
   * ```
   */
  regions?: SupportedAWSRegion[];
  /**
   * #### Temporarily pause the check without deleting it.
   *
   * ---
   *
   * A paused check keeps its history and incidents but stops probing and alerting. Useful during planned
   * maintenance.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   apiHealth:
   *     type: uptime-check
   *     properties:
   *       url: https://api.example.com/health
   *       # stp-focus
   *       enabled: false
   *       # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { UptimeCheck, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const apiHealth = new UptimeCheck({
   *     url: 'https://api.example.com/health',
   *     // stp-focus
   *     enabled: false
   *     // stp-end-focus
   *   });
   *   return { resources: { apiHealth } };
   * });
   * ```
   *
   * @default true
   */
  enabled?: boolean;
  /**
   * #### Where to send notifications when the check goes down or recovers.
   *
   * ---
   *
   * Accepts inline destinations (`slack`, `ms-teams`, `discord`, `email`, `webhook`) and references to
   * channels configured in the Stacktape Console (`console-channel`). State changes always appear in the
   * Console's monitoring history, even with no channels configured.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   apiHealth:
   *     type: uptime-check
   *     properties:
   *       url: https://api.example.com/health
   *       # stp-focus
   *       notificationChannels:
   *         - type: console-channel
   *           properties:
   *             channelName: engineering-slack
   *         - type: email
   *           properties:
   *             sender: alerts@example.com
   *             recipient: oncall@example.com
   *       # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { UptimeCheck, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const apiHealth = new UptimeCheck({
   *     url: 'https://api.example.com/health',
   *     // stp-focus
   *     notificationChannels: [
   *       { type: 'console-channel', properties: { channelName: 'engineering-slack' } },
   *       { type: 'email', properties: { sender: 'alerts@example.com', recipient: 'oncall@example.com' } }
   *     ]
   *     // stp-end-focus
   *   });
   *   return { resources: { apiHealth } };
   * });
   * ```
   */
  notificationChannels?: NotificationChannel[];
}


export interface UptimeCheckEvaluation {
  /**
   * #### How many consecutive failed evaluations mark the check as down.
   *
   * ---
   *
   * Allowed range: 1 to 10.
   *
   * @default 2
   */
  consecutiveFailures?: number;
  /**
   * #### How many consecutive successful evaluations mark a down check as recovered.
   *
   * ---
   *
   * Allowed range: 1 to 10.
   *
   * @default 2
   */
  consecutiveSuccesses?: number;
}


export interface StatusCodeAssertionProps {
  /**
   * #### HTTP status codes counted as successful.
   *
   * ---
   *
   * The response status must exactly match one of the listed codes.
   */
  accepted: number[];
}


export interface StatusCodeAssertion {
  type: 'status-code';
  properties: StatusCodeAssertionProps;
}


export interface BodyContainsAssertionProps {
  /**
   * #### Text that must appear in the response body.
   *
   * ---
   *
   * Matched against the first 512 KB of the response. Requires the `GET` method.
   */
  value: string;
}


export interface BodyContainsAssertion {
  type: 'body-contains';
  properties: BodyContainsAssertionProps;
}


/**
 * #### A condition the probe response must meet.
 */
export type UptimeCheckAssertion = StatusCodeAssertion | BodyContainsAssertion;
