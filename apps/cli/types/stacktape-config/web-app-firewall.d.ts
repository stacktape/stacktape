/**
 * #### Protects your APIs and websites from common attacks (SQL injection, XSS, bots, DDoS).
 *
 * ---
 *
 * Attach to an HTTP API Gateway, Application Load Balancer, or CDN. Comes with AWS-managed rule sets
 * by default. Costs ~$5/month base + $1/million requests inspected.
 */
interface WebAppFirewall {
  type: 'web-app-firewall';
  properties?: WebAppFirewallProps;
  overrides?: ResourceOverrides;
}

type StpWebAppFirewall = WebAppFirewall['properties'] & {
  name: string;
  type: WebAppFirewall['type'];
  configParentResourceType: WebAppFirewall['type'];
  nameChain: string[];
};

interface WebAppFirewallProps {
  /**
   * #### `cdn` for CloudFront-attached resources, `regional` for ALBs, User Pools, or direct API Gateways.
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
   *       # stp-focus
   *       scope: regional
   *       # stp-end-focus
   *       rules:
   *         - type: managed-rule-group
   *           properties:
   *             name: AWSManagedRulesCommonRuleSet
   *             vendorName: AWS
   *             priority: 0
   *   apiService:
   *     type: web-service
   *     properties:
   *       packaging:
   *         type: stacktape-image-buildpack
   *         properties:
   *           entryfilePath: src/index.ts
   *       resources:
   *         cpu: 0.25
   *         memory: 512
   *       loadBalancing:
   *         type: application-load-balancer
   *       useFirewall: apiFirewall
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { WebAppFirewall, WebService, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const apiFirewall = new WebAppFirewall({
   *     // stp-focus
   *     scope: 'regional',
   *     // stp-end-focus
   *     rules: [
   *       {
   *         type: 'managed-rule-group',
   *         properties: {
   *           name: 'AWSManagedRulesCommonRuleSet',
   *           vendorName: 'AWS',
   *           priority: 0
   *         }
   *       }
   *     ]
   *   });
   *
   *   const apiService = new WebService({
   *     packaging: {
   *       type: 'stacktape-image-buildpack',
   *       properties: { entryfilePath: 'src/index.ts' }
   *     },
   *     resources: { cpu: 0.25, memory: 512 },
   *     loadBalancing: { type: 'application-load-balancer' },
   *     useFirewall: 'apiFirewall'
   *   });
   *
   *   return { resources: { apiFirewall, apiService } };
   * });
   * ```
   */
  scope: 'regional' | 'cdn';
  /**
   * #### What happens when no rule matches a request.
   *
   * ---
   *
   * - **`Allow`** (recommended): Allow all traffic, block only what rules catch.
   * - **`Block`**: Block all traffic, allow only what rules explicitly permit (returns 403).
   *
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   adminFirewall:
   *     type: web-app-firewall
   *     properties:
   *       scope: regional
   *       # stp-focus
   *       defaultAction: Block
   *       # stp-end-focus
   *       rules:
   *         - type: managed-rule-group
   *           properties:
   *             name: AWSManagedRulesCommonRuleSet
   *             vendorName: AWS
   *             priority: 0
   *   adminService:
   *     type: web-service
   *     properties:
   *       packaging:
   *         type: stacktape-image-buildpack
   *         properties:
   *           entryfilePath: src/admin.ts
   *       resources:
   *         cpu: 0.25
   *         memory: 512
   *       loadBalancing:
   *         type: application-load-balancer
   *       useFirewall: adminFirewall
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { WebAppFirewall, WebService, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const adminFirewall = new WebAppFirewall({
   *     scope: 'regional',
   *     // stp-focus
   *     defaultAction: 'Block',
   *     // stp-end-focus
   *     rules: [
   *       {
   *         type: 'managed-rule-group',
   *         properties: {
   *           name: 'AWSManagedRulesCommonRuleSet',
   *           vendorName: 'AWS',
   *           priority: 0
   *         }
   *       }
   *     ]
   *   });
   *
   *   const adminService = new WebService({
   *     packaging: {
   *       type: 'stacktape-image-buildpack',
   *       properties: { entryfilePath: 'src/admin.ts' }
   *     },
   *     resources: { cpu: 0.25, memory: 512 },
   *     loadBalancing: { type: 'application-load-balancer' },
   *     useFirewall: 'adminFirewall'
   *   });
   *
   *   return { resources: { adminFirewall, adminService } };
   * });
   * ```
   *
   * @default Allow
   */
  defaultAction?: 'Allow' | 'Block';
  /**
   * #### Firewall rules: managed rule groups (AWS presets), custom rule groups, or rate-based rules.
   *
   * ---
   *
   * If omitted, Stacktape uses `AWSManagedRulesCommonRuleSet` + `AWSManagedRulesKnownBadInputsRuleSet` by default.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   apiFirewall:
   *     type: web-app-firewall
   *     properties:
   *       scope: regional
   *       # stp-focus
   *       rules:
   *         - type: managed-rule-group
   *           properties:
   *             name: AWSManagedRulesCommonRuleSet
   *             vendorName: AWS
   *             priority: 0
   *         - type: managed-rule-group
   *           properties:
   *             name: AWSManagedRulesKnownBadInputsRuleSet
   *             vendorName: AWS
   *             priority: 1
   *         - type: rate-based-rule
   *           properties:
   *             name: RateLimitPerIp
   *             limit: 2000
   *             aggregateBasedOn: IP
   *             priority: 2
   *       # stp-end-focus
   *   apiService:
   *     type: web-service
   *     properties:
   *       packaging:
   *         type: stacktape-image-buildpack
   *         properties:
   *           entryfilePath: src/index.ts
   *       resources:
   *         cpu: 0.25
   *         memory: 512
   *       loadBalancing:
   *         type: application-load-balancer
   *       useFirewall: apiFirewall
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { WebAppFirewall, WebService, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const apiFirewall = new WebAppFirewall({
   *     scope: 'regional',
   *     // stp-focus
   *     rules: [
   *       {
   *         type: 'managed-rule-group',
   *         properties: {
   *           name: 'AWSManagedRulesCommonRuleSet',
   *           vendorName: 'AWS',
   *           priority: 0
   *         }
   *       },
   *       {
   *         type: 'managed-rule-group',
   *         properties: {
   *           name: 'AWSManagedRulesKnownBadInputsRuleSet',
   *           vendorName: 'AWS',
   *           priority: 1
   *         }
   *       },
   *       {
   *         type: 'rate-based-rule',
   *         properties: {
   *           name: 'RateLimitPerIp',
   *           limit: 2000,
   *           aggregateBasedOn: 'IP',
   *           priority: 2
   *         }
   *       }
   *     ]
   *     // stp-end-focus
   *   });
   *
   *   const apiService = new WebService({
   *     packaging: {
   *       type: 'stacktape-image-buildpack',
   *       properties: { entryfilePath: 'src/index.ts' }
   *     },
   *     resources: { cpu: 0.25, memory: 512 },
   *     loadBalancing: { type: 'application-load-balancer' },
   *     useFirewall: 'apiFirewall'
   *   });
   *
   *   return { resources: { apiFirewall, apiService } };
   * });
   * ```
   */
  rules?: (ManagedRuleGroup | CustomRuleGroup | RateBasedStatement)[];
  /**
   * #### Custom response bodies for `Block` actions. Map of key → content type + body.
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
   *       defaultAction: Block
   *       # stp-focus
   *       customResponseBodies:
   *         accessDenied:
   *           contentType: application/json
   *           content: '{"error":"Access denied by web application firewall"}'
   *       # stp-end-focus
   *       rules:
   *         - type: managed-rule-group
   *           properties:
   *             name: AWSManagedRulesCommonRuleSet
   *             vendorName: AWS
   *             priority: 0
   *   apiService:
   *     type: web-service
   *     properties:
   *       packaging:
   *         type: stacktape-image-buildpack
   *         properties:
   *           entryfilePath: src/index.ts
   *       resources:
   *         cpu: 0.25
   *         memory: 512
   *       loadBalancing:
   *         type: application-load-balancer
   *       useFirewall: apiFirewall
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { WebAppFirewall, WebService, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const apiFirewall = new WebAppFirewall({
   *     scope: 'regional',
   *     defaultAction: 'Block',
   *     // stp-focus
   *     customResponseBodies: {
   *       accessDenied: {
   *         contentType: 'application/json',
   *         content: '{"error":"Access denied by web application firewall"}'
   *       }
   *     },
   *     // stp-end-focus
   *     rules: [
   *       {
   *         type: 'managed-rule-group',
   *         properties: {
   *           name: 'AWSManagedRulesCommonRuleSet',
   *           vendorName: 'AWS',
   *           priority: 0
   *         }
   *       }
   *     ]
   *   });
   *
   *   const apiService = new WebService({
   *     packaging: {
   *       type: 'stacktape-image-buildpack',
   *       properties: { entryfilePath: 'src/index.ts' }
   *     },
   *     resources: { cpu: 0.25, memory: 512 },
   *     loadBalancing: { type: 'application-load-balancer' },
   *     useFirewall: 'apiFirewall'
   *   });
   *
   *   return { resources: { apiFirewall, apiService } };
   * });
   * ```
   */
  customResponseBodies?: CustomResponseBodies;
  /**
   * #### Seconds a solved CAPTCHA stays valid before requiring re-verification.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   botFirewall:
   *     type: web-app-firewall
   *     properties:
   *       scope: regional
   *       # stp-focus
   *       captchaImmunityTime: 600
   *       # stp-end-focus
   *       rules:
   *         - type: rate-based-rule
   *           properties:
   *             name: SuspiciousTraffic
   *             limit: 500
   *             aggregateBasedOn: IP
   *             action: Captcha
   *             priority: 0
   *   apiService:
   *     type: web-service
   *     properties:
   *       packaging:
   *         type: stacktape-image-buildpack
   *         properties:
   *           entryfilePath: src/index.ts
   *       resources:
   *         cpu: 0.25
   *         memory: 512
   *       loadBalancing:
   *         type: application-load-balancer
   *       useFirewall: botFirewall
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { WebAppFirewall, WebService, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const botFirewall = new WebAppFirewall({
   *     scope: 'regional',
   *     // stp-focus
   *     captchaImmunityTime: 600,
   *     // stp-end-focus
   *     rules: [
   *       {
   *         type: 'rate-based-rule',
   *         properties: {
   *           name: 'SuspiciousTraffic',
   *           limit: 500,
   *           aggregateBasedOn: 'IP',
   *           action: 'Captcha',
   *           priority: 0
   *         }
   *       }
   *     ]
   *   });
   *
   *   const apiService = new WebService({
   *     packaging: {
   *       type: 'stacktape-image-buildpack',
   *       properties: { entryfilePath: 'src/index.ts' }
   *     },
   *     resources: { cpu: 0.25, memory: 512 },
   *     loadBalancing: { type: 'application-load-balancer' },
   *     useFirewall: 'botFirewall'
   *   });
   *
   *   return { resources: { botFirewall, apiService } };
   * });
   * ```
   *
   * @default 300
   */
  captchaImmunityTime?: number;
  /**
   * #### Seconds a solved challenge stays valid before requiring re-verification.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   botFirewall:
   *     type: web-app-firewall
   *     properties:
   *       scope: regional
   *       # stp-focus
   *       challengeImmunityTime: 900
   *       # stp-end-focus
   *       rules:
   *         - type: rate-based-rule
   *           properties:
   *             name: SuspiciousTraffic
   *             limit: 500
   *             aggregateBasedOn: IP
   *             action: Challenge
   *             priority: 0
   *   apiService:
   *     type: web-service
   *     properties:
   *       packaging:
   *         type: stacktape-image-buildpack
   *         properties:
   *           entryfilePath: src/index.ts
   *       resources:
   *         cpu: 0.25
   *         memory: 512
   *       loadBalancing:
   *         type: application-load-balancer
   *       useFirewall: botFirewall
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { WebAppFirewall, WebService, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const botFirewall = new WebAppFirewall({
   *     scope: 'regional',
   *     // stp-focus
   *     challengeImmunityTime: 900,
   *     // stp-end-focus
   *     rules: [
   *       {
   *         type: 'rate-based-rule',
   *         properties: {
   *           name: 'SuspiciousTraffic',
   *           limit: 500,
   *           aggregateBasedOn: 'IP',
   *           action: 'Challenge',
   *           priority: 0
   *         }
   *       }
   *     ]
   *   });
   *
   *   const apiService = new WebService({
   *     packaging: {
   *       type: 'stacktape-image-buildpack',
   *       properties: { entryfilePath: 'src/index.ts' }
   *     },
   *     resources: { cpu: 0.25, memory: 512 },
   *     loadBalancing: { type: 'application-load-balancer' },
   *     useFirewall: 'botFirewall'
   *   });
   *
   *   return { resources: { botFirewall, apiService } };
   * });
   * ```
   *
   * @default 300
   */
  challengeImmunityTime?: number;
  /**
   * #### Domains accepted in WAF tokens. Enables token sharing across multiple protected websites.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   edgeFirewall:
   *     type: web-app-firewall
   *     properties:
   *       scope: cdn
   *       # stp-focus
   *       tokenDomains:
   *         - app.example.com
   *         - admin.example.com
   *       # stp-end-focus
   *       rules:
   *         - type: managed-rule-group
   *           properties:
   *             name: AWSManagedRulesCommonRuleSet
   *             vendorName: AWS
   *             priority: 0
   *   web:
   *     type: nextjs-web
   *     properties:
   *       appDirectory: ./
   *       useFirewall: edgeFirewall
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { WebAppFirewall, NextjsWeb, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const edgeFirewall = new WebAppFirewall({
   *     scope: 'cdn',
   *     // stp-focus
   *     tokenDomains: ['app.example.com', 'admin.example.com'],
   *     // stp-end-focus
   *     rules: [
   *       {
   *         type: 'managed-rule-group',
   *         properties: {
   *           name: 'AWSManagedRulesCommonRuleSet',
   *           vendorName: 'AWS',
   *           priority: 0
   *         }
   *       }
   *     ]
   *   });
   *
   *   const web = new NextjsWeb({
   *     appDirectory: './',
   *     useFirewall: 'edgeFirewall'
   *   });
   *
   *   return { resources: { edgeFirewall, web } };
   * });
   * ```
   */
  tokenDomains?: string[];
  /**
   * #### Disable CloudWatch metrics for the firewall.
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
   *       # stp-focus
   *       disableMetrics: true
   *       # stp-end-focus
   *       rules:
   *         - type: managed-rule-group
   *           properties:
   *             name: AWSManagedRulesCommonRuleSet
   *             vendorName: AWS
   *             priority: 0
   *   apiService:
   *     type: web-service
   *     properties:
   *       packaging:
   *         type: stacktape-image-buildpack
   *         properties:
   *           entryfilePath: src/index.ts
   *       resources:
   *         cpu: 0.25
   *         memory: 512
   *       loadBalancing:
   *         type: application-load-balancer
   *       useFirewall: apiFirewall
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { WebAppFirewall, WebService, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const apiFirewall = new WebAppFirewall({
   *     scope: 'regional',
   *     // stp-focus
   *     disableMetrics: true,
   *     // stp-end-focus
   *     rules: [
   *       {
   *         type: 'managed-rule-group',
   *         properties: {
   *           name: 'AWSManagedRulesCommonRuleSet',
   *           vendorName: 'AWS',
   *           priority: 0
   *         }
   *       }
   *     ]
   *   });
   *
   *   const apiService = new WebService({
   *     packaging: {
   *       type: 'stacktape-image-buildpack',
   *       properties: { entryfilePath: 'src/index.ts' }
   *     },
   *     resources: { cpu: 0.25, memory: 512 },
   *     loadBalancing: { type: 'application-load-balancer' },
   *     useFirewall: 'apiFirewall'
   *   });
   *
   *   return { resources: { apiFirewall, apiService } };
   * });
   * ```
   *
   * @default false
   */
  disableMetrics?: boolean;
  /**
   * #### Save samples of matched requests for inspection in the AWS WAF console.
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
   *       # stp-focus
   *       sampledRequestsEnabled: true
   *       # stp-end-focus
   *       rules:
   *         - type: managed-rule-group
   *           properties:
   *             name: AWSManagedRulesCommonRuleSet
   *             vendorName: AWS
   *             priority: 0
   *   apiService:
   *     type: web-service
   *     properties:
   *       packaging:
   *         type: stacktape-image-buildpack
   *         properties:
   *           entryfilePath: src/index.ts
   *       resources:
   *         cpu: 0.25
   *         memory: 512
   *       loadBalancing:
   *         type: application-load-balancer
   *       useFirewall: apiFirewall
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { WebAppFirewall, WebService, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const apiFirewall = new WebAppFirewall({
   *     scope: 'regional',
   *     // stp-focus
   *     sampledRequestsEnabled: true,
   *     // stp-end-focus
   *     rules: [
   *       {
   *         type: 'managed-rule-group',
   *         properties: {
   *           name: 'AWSManagedRulesCommonRuleSet',
   *           vendorName: 'AWS',
   *           priority: 0
   *         }
   *       }
   *     ]
   *   });
   *
   *   const apiService = new WebService({
   *     packaging: {
   *       type: 'stacktape-image-buildpack',
   *       properties: { entryfilePath: 'src/index.ts' }
   *     },
   *     resources: { cpu: 0.25, memory: 512 },
   *     loadBalancing: { type: 'application-load-balancer' },
   *     useFirewall: 'apiFirewall'
   *   });
   *
   *   return { resources: { apiFirewall, apiService } };
   * });
   * ```
   *
   * @default false
   */
  sampledRequestsEnabled?: boolean;
}

interface CommonRuleProps {
  /**
   * #### Evaluation order. Lower = evaluated first. Must be unique across all rules.
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
   *       rules:
   *         - type: managed-rule-group
   *           properties:
   *             name: AWSManagedRulesCommonRuleSet
   *             vendorName: AWS
   *             # stp-focus
   *             priority: 0
   *             # stp-end-focus
   *         - type: managed-rule-group
   *           properties:
   *             name: AWSManagedRulesKnownBadInputsRuleSet
   *             vendorName: AWS
   *             priority: 1
   *   apiService:
   *     type: web-service
   *     properties:
   *       packaging:
   *         type: stacktape-image-buildpack
   *         properties:
   *           entryfilePath: src/index.ts
   *       resources:
   *         cpu: 0.25
   *         memory: 512
   *       loadBalancing:
   *         type: application-load-balancer
   *       useFirewall: apiFirewall
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { WebAppFirewall, WebService, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const apiFirewall = new WebAppFirewall({
   *     scope: 'regional',
   *     rules: [
   *       {
   *         type: 'managed-rule-group',
   *         properties: {
   *           name: 'AWSManagedRulesCommonRuleSet',
   *           vendorName: 'AWS',
   *           // stp-focus
   *           priority: 0
   *           // stp-end-focus
   *         }
   *       },
   *       {
   *         type: 'managed-rule-group',
   *         properties: {
   *           name: 'AWSManagedRulesKnownBadInputsRuleSet',
   *           vendorName: 'AWS',
   *           priority: 1
   *         }
   *       }
   *     ]
   *   });
   *
   *   const apiService = new WebService({
   *     packaging: {
   *       type: 'stacktape-image-buildpack',
   *       properties: { entryfilePath: 'src/index.ts' }
   *     },
   *     resources: { cpu: 0.25, memory: 512 },
   *     loadBalancing: { type: 'application-load-balancer' },
   *     useFirewall: 'apiFirewall'
   *   });
   *
   *   return { resources: { apiFirewall, apiService } };
   * });
   * ```
   */
  priority: number;
  /*
   * #### The name of the rule.
   *
   * ---
   *
   * - For a `managed-rule-group`, this is the name of the rule group used along with the `vendorName`.
   * - For other rule types, this is an arbitrary value used to identify the rule.
   */
  name: string;
  /**
   * #### Disable CloudWatch metrics for this rule.
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
   *       rules:
   *         - type: managed-rule-group
   *           properties:
   *             name: AWSManagedRulesCommonRuleSet
   *             vendorName: AWS
   *             priority: 0
   *             # stp-focus
   *             disableMetrics: true
   *             # stp-end-focus
   *   apiService:
   *     type: web-service
   *     properties:
   *       packaging:
   *         type: stacktape-image-buildpack
   *         properties:
   *           entryfilePath: src/index.ts
   *       resources:
   *         cpu: 0.25
   *         memory: 512
   *       loadBalancing:
   *         type: application-load-balancer
   *       useFirewall: apiFirewall
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { WebAppFirewall, WebService, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const apiFirewall = new WebAppFirewall({
   *     scope: 'regional',
   *     rules: [
   *       {
   *         type: 'managed-rule-group',
   *         properties: {
   *           name: 'AWSManagedRulesCommonRuleSet',
   *           vendorName: 'AWS',
   *           priority: 0,
   *           // stp-focus
   *           disableMetrics: true
   *           // stp-end-focus
   *         }
   *       }
   *     ]
   *   });
   *
   *   const apiService = new WebService({
   *     packaging: {
   *       type: 'stacktape-image-buildpack',
   *       properties: { entryfilePath: 'src/index.ts' }
   *     },
   *     resources: { cpu: 0.25, memory: 512 },
   *     loadBalancing: { type: 'application-load-balancer' },
   *     useFirewall: 'apiFirewall'
   *   });
   *
   *   return { resources: { apiFirewall, apiService } };
   * });
   * ```
   *
   * @default false
   */
  disableMetrics?: boolean;
  /**
   * #### Save samples of requests matching this rule for inspection in the WAF console.
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
   *       rules:
   *         - type: managed-rule-group
   *           properties:
   *             name: AWSManagedRulesCommonRuleSet
   *             vendorName: AWS
   *             priority: 0
   *             # stp-focus
   *             sampledRequestsEnabled: true
   *             # stp-end-focus
   *   apiService:
   *     type: web-service
   *     properties:
   *       packaging:
   *         type: stacktape-image-buildpack
   *         properties:
   *           entryfilePath: src/index.ts
   *       resources:
   *         cpu: 0.25
   *         memory: 512
   *       loadBalancing:
   *         type: application-load-balancer
   *       useFirewall: apiFirewall
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { WebAppFirewall, WebService, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const apiFirewall = new WebAppFirewall({
   *     scope: 'regional',
   *     rules: [
   *       {
   *         type: 'managed-rule-group',
   *         properties: {
   *           name: 'AWSManagedRulesCommonRuleSet',
   *           vendorName: 'AWS',
   *           priority: 0,
   *           // stp-focus
   *           sampledRequestsEnabled: true
   *           // stp-end-focus
   *         }
   *       }
   *     ]
   *   });
   *
   *   const apiService = new WebService({
   *     packaging: {
   *       type: 'stacktape-image-buildpack',
   *       properties: { entryfilePath: 'src/index.ts' }
   *     },
   *     resources: { cpu: 0.25, memory: 512 },
   *     loadBalancing: { type: 'application-load-balancer' },
   *     useFirewall: 'apiFirewall'
   *   });
   *
   *   return { resources: { apiFirewall, apiService } };
   * });
   * ```
   *
   * @default false
   */
  sampledRequestsEnabled?: boolean;
}

interface ManagedRuleGroup {
  type: 'managed-rule-group';
  properties: ManagedRuleGroupProps;
}

interface ManagedRuleGroupProps extends CommonRuleProps {
  /**
   * #### Vendor name (e.g., `AWS` for AWS-managed rules).
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
   *       rules:
   *         - type: managed-rule-group
   *           properties:
   *             name: AWSManagedRulesCommonRuleSet
   *             # stp-focus
   *             vendorName: AWS
   *             # stp-end-focus
   *             priority: 0
   *   apiService:
   *     type: web-service
   *     properties:
   *       packaging:
   *         type: stacktape-image-buildpack
   *         properties:
   *           entryfilePath: src/index.ts
   *       resources:
   *         cpu: 0.25
   *         memory: 512
   *       loadBalancing:
   *         type: application-load-balancer
   *       useFirewall: apiFirewall
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { WebAppFirewall, WebService, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const apiFirewall = new WebAppFirewall({
   *     scope: 'regional',
   *     rules: [
   *       {
   *         type: 'managed-rule-group',
   *         properties: {
   *           name: 'AWSManagedRulesCommonRuleSet',
   *           // stp-focus
   *           vendorName: 'AWS',
   *           // stp-end-focus
   *           priority: 0
   *         }
   *       }
   *     ]
   *   });
   *
   *   const apiService = new WebService({
   *     packaging: {
   *       type: 'stacktape-image-buildpack',
   *       properties: { entryfilePath: 'src/index.ts' }
   *     },
   *     resources: { cpu: 0.25, memory: 512 },
   *     loadBalancing: { type: 'application-load-balancer' },
   *     useFirewall: 'apiFirewall'
   *   });
   *
   *   return { resources: { apiFirewall, apiService } };
   * });
   * ```
   */
  vendorName: string;
  /**
   * #### Rules within this group to skip (by rule name). Useful for disabling false positives.
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
   *       rules:
   *         - type: managed-rule-group
   *           properties:
   *             name: AWSManagedRulesCommonRuleSet
   *             vendorName: AWS
   *             priority: 0
   *             # stp-focus
   *             excludedRules:
   *               - SizeRestrictions_BODY
   *               - GenericRFI_BODY
   *             # stp-end-focus
   *   apiService:
   *     type: web-service
   *     properties:
   *       packaging:
   *         type: stacktape-image-buildpack
   *         properties:
   *           entryfilePath: src/index.ts
   *       resources:
   *         cpu: 0.25
   *         memory: 512
   *       loadBalancing:
   *         type: application-load-balancer
   *       useFirewall: apiFirewall
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { WebAppFirewall, WebService, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const apiFirewall = new WebAppFirewall({
   *     scope: 'regional',
   *     rules: [
   *       {
   *         type: 'managed-rule-group',
   *         properties: {
   *           name: 'AWSManagedRulesCommonRuleSet',
   *           vendorName: 'AWS',
   *           priority: 0,
   *           // stp-focus
   *           excludedRules: ['SizeRestrictions_BODY', 'GenericRFI_BODY']
   *           // stp-end-focus
   *         }
   *       }
   *     ]
   *   });
   *
   *   const apiService = new WebService({
   *     packaging: {
   *       type: 'stacktape-image-buildpack',
   *       properties: { entryfilePath: 'src/index.ts' }
   *     },
   *     resources: { cpu: 0.25, memory: 512 },
   *     loadBalancing: { type: 'application-load-balancer' },
   *     useFirewall: 'apiFirewall'
   *   });
   *
   *   return { resources: { apiFirewall, apiService } };
   * });
   * ```
   */
  excludedRules?: string[];
  /**
   * #### `None` = apply normally, `Count` = log matches without blocking (dry-run mode).
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
   *       rules:
   *         - type: managed-rule-group
   *           properties:
   *             name: AWSManagedRulesCommonRuleSet
   *             vendorName: AWS
   *             priority: 0
   *             # stp-focus
   *             overrideAction: Count
   *             # stp-end-focus
   *   apiService:
   *     type: web-service
   *     properties:
   *       packaging:
   *         type: stacktape-image-buildpack
   *         properties:
   *           entryfilePath: src/index.ts
   *       resources:
   *         cpu: 0.25
   *         memory: 512
   *       loadBalancing:
   *         type: application-load-balancer
   *       useFirewall: apiFirewall
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { WebAppFirewall, WebService, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const apiFirewall = new WebAppFirewall({
   *     scope: 'regional',
   *     rules: [
   *       {
   *         type: 'managed-rule-group',
   *         properties: {
   *           name: 'AWSManagedRulesCommonRuleSet',
   *           vendorName: 'AWS',
   *           priority: 0,
   *           // stp-focus
   *           overrideAction: 'Count'
   *           // stp-end-focus
   *         }
   *       }
   *     ]
   *   });
   *
   *   const apiService = new WebService({
   *     packaging: {
   *       type: 'stacktape-image-buildpack',
   *       properties: { entryfilePath: 'src/index.ts' }
   *     },
   *     resources: { cpu: 0.25, memory: 512 },
   *     loadBalancing: { type: 'application-load-balancer' },
   *     useFirewall: 'apiFirewall'
   *   });
   *
   *   return { resources: { apiFirewall, apiService } };
   * });
   * ```
   */
  overrideAction?: 'None' | 'Count';
}

interface CustomRuleGroup {
  type: 'custom-rule-group';
  properties: CustomRuleGroupProps;
}

interface CustomRuleGroupProps extends CommonRuleProps {
  /**
   * #### ARN of the custom WAF rule group.
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
   *       rules:
   *         - type: custom-rule-group
   *           properties:
   *             name: CompanyRuleGroup
   *             # stp-focus
   *             arn: arn:aws:wafv2:eu-west-1:123456789012:regional/rulegroup/company-rules/abcd1234-5678-90ef-ghij-klmnopqrstuv
   *             # stp-end-focus
   *             priority: 0
   *   apiService:
   *     type: web-service
   *     properties:
   *       packaging:
   *         type: stacktape-image-buildpack
   *         properties:
   *           entryfilePath: src/index.ts
   *       resources:
   *         cpu: 0.25
   *         memory: 512
   *       loadBalancing:
   *         type: application-load-balancer
   *       useFirewall: apiFirewall
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { WebAppFirewall, WebService, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const apiFirewall = new WebAppFirewall({
   *     scope: 'regional',
   *     rules: [
   *       {
   *         type: 'custom-rule-group',
   *         properties: {
   *           name: 'CompanyRuleGroup',
   *           // stp-focus
   *           arn: 'arn:aws:wafv2:eu-west-1:123456789012:regional/rulegroup/company-rules/abcd1234-5678-90ef-ghij-klmnopqrstuv',
   *           // stp-end-focus
   *           priority: 0
   *         }
   *       }
   *     ]
   *   });
   *
   *   const apiService = new WebService({
   *     packaging: {
   *       type: 'stacktape-image-buildpack',
   *       properties: { entryfilePath: 'src/index.ts' }
   *     },
   *     resources: { cpu: 0.25, memory: 512 },
   *     loadBalancing: { type: 'application-load-balancer' },
   *     useFirewall: 'apiFirewall'
   *   });
   *
   *   return { resources: { apiFirewall, apiService } };
   * });
   * ```
   */
  arn: string;
  /**
   * #### `None` = apply normally, `Count` = log matches without blocking (dry-run mode).
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
   *       rules:
   *         - type: custom-rule-group
   *           properties:
   *             name: CompanyRuleGroup
   *             arn: arn:aws:wafv2:eu-west-1:123456789012:regional/rulegroup/company-rules/abcd1234-5678-90ef-ghij-klmnopqrstuv
   *             priority: 0
   *             # stp-focus
   *             overrideAction: Count
   *             # stp-end-focus
   *   apiService:
   *     type: web-service
   *     properties:
   *       packaging:
   *         type: stacktape-image-buildpack
   *         properties:
   *           entryfilePath: src/index.ts
   *       resources:
   *         cpu: 0.25
   *         memory: 512
   *       loadBalancing:
   *         type: application-load-balancer
   *       useFirewall: apiFirewall
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { WebAppFirewall, WebService, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const apiFirewall = new WebAppFirewall({
   *     scope: 'regional',
   *     rules: [
   *       {
   *         type: 'custom-rule-group',
   *         properties: {
   *           name: 'CompanyRuleGroup',
   *           arn: 'arn:aws:wafv2:eu-west-1:123456789012:regional/rulegroup/company-rules/abcd1234-5678-90ef-ghij-klmnopqrstuv',
   *           priority: 0,
   *           // stp-focus
   *           overrideAction: 'Count'
   *           // stp-end-focus
   *         }
   *       }
   *     ]
   *   });
   *
   *   const apiService = new WebService({
   *     packaging: {
   *       type: 'stacktape-image-buildpack',
   *       properties: { entryfilePath: 'src/index.ts' }
   *     },
   *     resources: { cpu: 0.25, memory: 512 },
   *     loadBalancing: { type: 'application-load-balancer' },
   *     useFirewall: 'apiFirewall'
   *   });
   *
   *   return { resources: { apiFirewall, apiService } };
   * });
   * ```
   */
  overrideAction?: 'None' | 'Count';
}

interface RateBasedStatement {
  type: 'rate-based-rule';
  properties: RateBasedStatementProps;
}

interface RateBasedStatementProps extends CommonRuleProps {
  /**
   * #### Max requests per IP in a 5-minute window. Range: 100–20,000,000. Exceeding triggers the `action`.
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
   *       rules:
   *         - type: rate-based-rule
   *           properties:
   *             name: RateLimitPerIp
   *             # stp-focus
   *             limit: 2000
   *             # stp-end-focus
   *             aggregateBasedOn: IP
   *             action: Block
   *             priority: 0
   *   apiService:
   *     type: web-service
   *     properties:
   *       packaging:
   *         type: stacktape-image-buildpack
   *         properties:
   *           entryfilePath: src/index.ts
   *       resources:
   *         cpu: 0.25
   *         memory: 512
   *       loadBalancing:
   *         type: application-load-balancer
   *       useFirewall: apiFirewall
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { WebAppFirewall, WebService, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const apiFirewall = new WebAppFirewall({
   *     scope: 'regional',
   *     rules: [
   *       {
   *         type: 'rate-based-rule',
   *         properties: {
   *           name: 'RateLimitPerIp',
   *           // stp-focus
   *           limit: 2000,
   *           // stp-end-focus
   *           aggregateBasedOn: 'IP',
   *           action: 'Block',
   *           priority: 0
   *         }
   *       }
   *     ]
   *   });
   *
   *   const apiService = new WebService({
   *     packaging: {
   *       type: 'stacktape-image-buildpack',
   *       properties: { entryfilePath: 'src/index.ts' }
   *     },
   *     resources: { cpu: 0.25, memory: 512 },
   *     loadBalancing: { type: 'application-load-balancer' },
   *     useFirewall: 'apiFirewall'
   *   });
   *
   *   return { resources: { apiFirewall, apiService } };
   * });
   * ```
   */
  limit: number;
  /**
   * #### `IP` = direct client IP, `FORWARDED_IP` = IP from a header (e.g., `X-Forwarded-For` behind a proxy).
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
   *       rules:
   *         - type: rate-based-rule
   *           properties:
   *             name: RateLimitForwarded
   *             limit: 2000
   *             # stp-focus
   *             aggregateBasedOn: FORWARDED_IP
   *             # stp-end-focus
   *             forwardedIPConfig:
   *               headerName: X-Forwarded-For
   *               fallbackBehavior: NO_MATCH
   *             action: Block
   *             priority: 0
   *   apiService:
   *     type: web-service
   *     properties:
   *       packaging:
   *         type: stacktape-image-buildpack
   *         properties:
   *           entryfilePath: src/index.ts
   *       resources:
   *         cpu: 0.25
   *         memory: 512
   *       loadBalancing:
   *         type: application-load-balancer
   *       useFirewall: apiFirewall
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { WebAppFirewall, WebService, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const apiFirewall = new WebAppFirewall({
   *     scope: 'regional',
   *     rules: [
   *       {
   *         type: 'rate-based-rule',
   *         properties: {
   *           name: 'RateLimitForwarded',
   *           limit: 2000,
   *           // stp-focus
   *           aggregateBasedOn: 'FORWARDED_IP',
   *           // stp-end-focus
   *           forwardedIPConfig: {
   *             headerName: 'X-Forwarded-For',
   *             fallbackBehavior: 'NO_MATCH'
   *           },
   *           action: 'Block',
   *           priority: 0
   *         }
   *       }
   *     ]
   *   });
   *
   *   const apiService = new WebService({
   *     packaging: {
   *       type: 'stacktape-image-buildpack',
   *       properties: { entryfilePath: 'src/index.ts' }
   *     },
   *     resources: { cpu: 0.25, memory: 512 },
   *     loadBalancing: { type: 'application-load-balancer' },
   *     useFirewall: 'apiFirewall'
   *   });
   *
   *   return { resources: { apiFirewall, apiService } };
   * });
   * ```
   */
  aggregateBasedOn?: 'IP' | 'FORWARDED_IP';
  /**
   * #### Header and fallback settings when using `FORWARDED_IP` aggregation.
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
   *       rules:
   *         - type: rate-based-rule
   *           properties:
   *             name: RateLimitForwarded
   *             limit: 2000
   *             aggregateBasedOn: FORWARDED_IP
   *             # stp-focus
   *             forwardedIPConfig:
   *               headerName: X-Forwarded-For
   *               fallbackBehavior: NO_MATCH
   *             # stp-end-focus
   *             action: Block
   *             priority: 0
   *   apiService:
   *     type: web-service
   *     properties:
   *       packaging:
   *         type: stacktape-image-buildpack
   *         properties:
   *           entryfilePath: src/index.ts
   *       resources:
   *         cpu: 0.25
   *         memory: 512
   *       loadBalancing:
   *         type: application-load-balancer
   *       useFirewall: apiFirewall
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { WebAppFirewall, WebService, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const apiFirewall = new WebAppFirewall({
   *     scope: 'regional',
   *     rules: [
   *       {
   *         type: 'rate-based-rule',
   *         properties: {
   *           name: 'RateLimitForwarded',
   *           limit: 2000,
   *           aggregateBasedOn: 'FORWARDED_IP',
   *           // stp-focus
   *           forwardedIPConfig: {
   *             headerName: 'X-Forwarded-For',
   *             fallbackBehavior: 'NO_MATCH'
   *           },
   *           // stp-end-focus
   *           action: 'Block',
   *           priority: 0
   *         }
   *       }
   *     ]
   *   });
   *
   *   const apiService = new WebService({
   *     packaging: {
   *       type: 'stacktape-image-buildpack',
   *       properties: { entryfilePath: 'src/index.ts' }
   *     },
   *     resources: { cpu: 0.25, memory: 512 },
   *     loadBalancing: { type: 'application-load-balancer' },
   *     useFirewall: 'apiFirewall'
   *   });
   *
   *   return { resources: { apiFirewall, apiService } };
   * });
   * ```
   */
  forwardedIPConfig?: ForwardedIPConfig;
  /**
   * #### What to do when the rate limit is exceeded.
   *
   * ---
   *
   * - `Block`: Return 403 (most common for rate limiting).
   * - `Count`: Log only, don't block (useful for testing thresholds).
   * - `Captcha`/`Challenge`: Verify the client is human.
   *
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   apiFirewall:
   *     type: web-app-firewall
   *     properties:
   *       scope: regional
   *       rules:
   *         - type: rate-based-rule
   *           properties:
   *             name: RateLimitPerIp
   *             limit: 500
   *             aggregateBasedOn: IP
   *             # stp-focus
   *             action: Captcha
   *             # stp-end-focus
   *             priority: 0
   *   apiService:
   *     type: web-service
   *     properties:
   *       packaging:
   *         type: stacktape-image-buildpack
   *         properties:
   *           entryfilePath: src/index.ts
   *       resources:
   *         cpu: 0.25
   *         memory: 512
   *       loadBalancing:
   *         type: application-load-balancer
   *       useFirewall: apiFirewall
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { WebAppFirewall, WebService, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const apiFirewall = new WebAppFirewall({
   *     scope: 'regional',
   *     rules: [
   *       {
   *         type: 'rate-based-rule',
   *         properties: {
   *           name: 'RateLimitPerIp',
   *           limit: 500,
   *           aggregateBasedOn: 'IP',
   *           // stp-focus
   *           action: 'Captcha',
   *           // stp-end-focus
   *           priority: 0
   *         }
   *       }
   *     ]
   *   });
   *
   *   const apiService = new WebService({
   *     packaging: {
   *       type: 'stacktape-image-buildpack',
   *       properties: { entryfilePath: 'src/index.ts' }
   *     },
   *     resources: { cpu: 0.25, memory: 512 },
   *     loadBalancing: { type: 'application-load-balancer' },
   *     useFirewall: 'apiFirewall'
   *   });
   *
   *   return { resources: { apiFirewall, apiService } };
   * });
   * ```
   *
   * @default Block
   */
  action?: 'Allow' | 'Block' | 'Count' | 'Captcha' | 'Challenge';
}

interface ForwardedIPConfig {
  /**
   * #### What to do when the header is missing. `MATCH` = apply rule action, `NO_MATCH` = skip.
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
   *       rules:
   *         - type: rate-based-rule
   *           properties:
   *             name: RateLimitForwarded
   *             limit: 2000
   *             aggregateBasedOn: FORWARDED_IP
   *             forwardedIPConfig:
   *               headerName: X-Forwarded-For
   *               # stp-focus
   *               fallbackBehavior: MATCH
   *               # stp-end-focus
   *             action: Block
   *             priority: 0
   *   apiService:
   *     type: web-service
   *     properties:
   *       packaging:
   *         type: stacktape-image-buildpack
   *         properties:
   *           entryfilePath: src/index.ts
   *       resources:
   *         cpu: 0.25
   *         memory: 512
   *       loadBalancing:
   *         type: application-load-balancer
   *       useFirewall: apiFirewall
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { WebAppFirewall, WebService, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const apiFirewall = new WebAppFirewall({
   *     scope: 'regional',
   *     rules: [
   *       {
   *         type: 'rate-based-rule',
   *         properties: {
   *           name: 'RateLimitForwarded',
   *           limit: 2000,
   *           aggregateBasedOn: 'FORWARDED_IP',
   *           forwardedIPConfig: {
   *             headerName: 'X-Forwarded-For',
   *             // stp-focus
   *             fallbackBehavior: 'MATCH'
   *             // stp-end-focus
   *           },
   *           action: 'Block',
   *           priority: 0
   *         }
   *       }
   *     ]
   *   });
   *
   *   const apiService = new WebService({
   *     packaging: {
   *       type: 'stacktape-image-buildpack',
   *       properties: { entryfilePath: 'src/index.ts' }
   *     },
   *     resources: { cpu: 0.25, memory: 512 },
   *     loadBalancing: { type: 'application-load-balancer' },
   *     useFirewall: 'apiFirewall'
   *   });
   *
   *   return { resources: { apiFirewall, apiService } };
   * });
   * ```
   */
  fallbackBehavior: 'MATCH' | 'NO_MATCH';
  /**
   * #### HTTP header containing the client IP (e.g., `X-Forwarded-For`).
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
   *       rules:
   *         - type: rate-based-rule
   *           properties:
   *             name: RateLimitForwarded
   *             limit: 2000
   *             aggregateBasedOn: FORWARDED_IP
   *             forwardedIPConfig:
   *               # stp-focus
   *               headerName: X-Forwarded-For
   *               # stp-end-focus
   *               fallbackBehavior: NO_MATCH
   *             action: Block
   *             priority: 0
   *   apiService:
   *     type: web-service
   *     properties:
   *       packaging:
   *         type: stacktape-image-buildpack
   *         properties:
   *           entryfilePath: src/index.ts
   *       resources:
   *         cpu: 0.25
   *         memory: 512
   *       loadBalancing:
   *         type: application-load-balancer
   *       useFirewall: apiFirewall
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { WebAppFirewall, WebService, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const apiFirewall = new WebAppFirewall({
   *     scope: 'regional',
   *     rules: [
   *       {
   *         type: 'rate-based-rule',
   *         properties: {
   *           name: 'RateLimitForwarded',
   *           limit: 2000,
   *           aggregateBasedOn: 'FORWARDED_IP',
   *           forwardedIPConfig: {
   *             // stp-focus
   *             headerName: 'X-Forwarded-For',
   *             // stp-end-focus
   *             fallbackBehavior: 'NO_MATCH'
   *           },
   *           action: 'Block',
   *           priority: 0
   *         }
   *       }
   *     ]
   *   });
   *
   *   const apiService = new WebService({
   *     packaging: {
   *       type: 'stacktape-image-buildpack',
   *       properties: { entryfilePath: 'src/index.ts' }
   *     },
   *     resources: { cpu: 0.25, memory: 512 },
   *     loadBalancing: { type: 'application-load-balancer' },
   *     useFirewall: 'apiFirewall'
   *   });
   *
   *   return { resources: { apiFirewall, apiService } };
   * });
   * ```
   */
  headerName: string;
}

interface CustomResponseBodies {
  [key: string]: {
    /**
     * #### MIME type: `application/json`, `text/plain`, or `text/html`.
     *
     * ---
     *
     * **Example (YAML):**
     *
     * ```yaml
     * resources:
     *   siteFirewall:
     *     type: web-app-firewall
     *     properties:
     *       scope: regional
     *       defaultAction: Block
     *       customResponseBodies:
     *         blockedPage:
     *           # stp-focus
     *           contentType: text/html
     *           # stp-end-focus
     *           content: '<html><body><h1>403 Forbidden</h1></body></html>'
     *       rules:
     *         - type: managed-rule-group
     *           properties:
     *             name: AWSManagedRulesCommonRuleSet
     *             vendorName: AWS
     *             priority: 0
     *   siteService:
     *     type: web-service
     *     properties:
     *       packaging:
     *         type: stacktape-image-buildpack
     *         properties:
     *           entryfilePath: src/index.ts
     *       resources:
     *         cpu: 0.25
     *         memory: 512
     *       loadBalancing:
     *         type: application-load-balancer
     *       useFirewall: siteFirewall
     * ```
     *
     * **Example (TypeScript):**
     *
     * ```ts
     * import { WebAppFirewall, WebService, defineConfig } from 'stacktape';
     *
     * export default defineConfig(() => {
     *   const siteFirewall = new WebAppFirewall({
     *     scope: 'regional',
     *     defaultAction: 'Block',
     *     customResponseBodies: {
     *       blockedPage: {
     *         // stp-focus
     *         contentType: 'text/html',
     *         // stp-end-focus
     *         content: '<html><body><h1>403 Forbidden</h1></body></html>'
     *       }
     *     },
     *     rules: [
     *       {
     *         type: 'managed-rule-group',
     *         properties: {
     *           name: 'AWSManagedRulesCommonRuleSet',
     *           vendorName: 'AWS',
     *           priority: 0
     *         }
     *       }
     *     ]
     *   });
     *
     *   const siteService = new WebService({
     *     packaging: {
     *       type: 'stacktape-image-buildpack',
     *       properties: { entryfilePath: 'src/index.ts' }
     *     },
     *     resources: { cpu: 0.25, memory: 512 },
     *     loadBalancing: { type: 'application-load-balancer' },
     *     useFirewall: 'siteFirewall'
     *   });
     *
     *   return { resources: { siteFirewall, siteService } };
     * });
     * ```
     */
    contentType: string;
    /**
     * #### Response body content.
     *
     * ---
     *
     * **Example (YAML):**
     *
     * ```yaml
     * resources:
     *   siteFirewall:
     *     type: web-app-firewall
     *     properties:
     *       scope: regional
     *       defaultAction: Block
     *       customResponseBodies:
     *         blockedPlain:
     *           contentType: text/plain
     *           # stp-focus
     *           content: 'Your request was blocked by our web application firewall.'
     *           # stp-end-focus
     *       rules:
     *         - type: managed-rule-group
     *           properties:
     *             name: AWSManagedRulesCommonRuleSet
     *             vendorName: AWS
     *             priority: 0
     *   siteService:
     *     type: web-service
     *     properties:
     *       packaging:
     *         type: stacktape-image-buildpack
     *         properties:
     *           entryfilePath: src/index.ts
     *       resources:
     *         cpu: 0.25
     *         memory: 512
     *       loadBalancing:
     *         type: application-load-balancer
     *       useFirewall: siteFirewall
     * ```
     *
     * **Example (TypeScript):**
     *
     * ```ts
     * import { WebAppFirewall, WebService, defineConfig } from 'stacktape';
     *
     * export default defineConfig(() => {
     *   const siteFirewall = new WebAppFirewall({
     *     scope: 'regional',
     *     defaultAction: 'Block',
     *     customResponseBodies: {
     *       blockedPlain: {
     *         contentType: 'text/plain',
     *         // stp-focus
     *         content: 'Your request was blocked by our web application firewall.'
     *         // stp-end-focus
     *       }
     *     },
     *     rules: [
     *       {
     *         type: 'managed-rule-group',
     *         properties: {
     *           name: 'AWSManagedRulesCommonRuleSet',
     *           vendorName: 'AWS',
     *           priority: 0
     *         }
     *       }
     *     ]
     *   });
     *
     *   const siteService = new WebService({
     *     packaging: {
     *       type: 'stacktape-image-buildpack',
     *       properties: { entryfilePath: 'src/index.ts' }
     *     },
     *     resources: { cpu: 0.25, memory: 512 },
     *     loadBalancing: { type: 'application-load-balancer' },
     *     useFirewall: 'siteFirewall'
     *   });
     *
     *   return { resources: { siteFirewall, siteService } };
     * });
     * ```
     */
    content: string;
  };
}

type WebAppFirewallReferencableParams = 'arn' | 'scope';
