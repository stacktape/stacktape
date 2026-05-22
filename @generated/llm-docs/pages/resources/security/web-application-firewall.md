# Web Application Firewall

A Stacktape web application firewall (WAF) blocks common web exploits — SQL injection, cross-site scripting, bad bots, and volumetric attacks — before they reach your APIs, load balancers, and auth pools. It uses AWS WAF underneath and ships with AWS-managed rule sets by default, providing baseline protection with minimal configuration.

**Pricing:** ~$5/month base + ~$1 per million requests inspected. See the [AWS WAF pricing page](https://aws.amazon.com/waf/pricing/) for per-rule-group and bot control pricing.

## When to use

Use a web application firewall when your stack exposes public endpoints that handle untrusted traffic. Common scenarios:

- **Public APIs behind an [Application Load Balancer](/resources/networking/application-load-balancer)** — protect against SQL injection, XSS, and request flooding.
- **[HTTP API Gateways](/resources/networking/http-api-gateway)** — add HTTP request inspection beyond API Gateway's built-in throttling. Attach directly with a `regional` firewall, or at the CloudFront edge with a `cdn` firewall when CDN is enabled on the gateway.
- **[User auth pools](/resources/security/user-auth-pool)** — rate-limit brute-force login attempts and block known-bad IP ranges on hosted UI and token endpoints.
- **[Static hosting](/resources/frontend/static-hosting) and SSR frontends** ([Next.js](/resources/frontend/nextjs), [Astro](/resources/frontend/astro), [Nuxt](/resources/frontend/nuxt), etc.) — block bot scraping and abuse at the CloudFront edge before requests reach your origin.
- **Rate limiting** — cap requests per IP to prevent a single client from overloading your service.

For most production stacks with public-facing resources, enabling a WAF is a low-effort, high-value security improvement.

## When NOT to use

- **Internal-only services** — a [private service](/resources/compute/private-service) or [worker service](/resources/compute/worker-service) with no public endpoint doesn't receive untrusted traffic. A WAF adds cost with no benefit.
- **Low-traffic side projects** — the ~$5/month base cost may not be worth it for a personal project with negligible traffic. Built-in API Gateway throttling and AWS Shield Standard (free Layer 3/4 protection) may be enough.
- **Network-layer protection only** — AWS WAF operates at Layer 7 (HTTP/HTTPS). For Layer 3/4 protection (TCP flood, UDP reflection), AWS Shield Standard covers that automatically on all AWS accounts. WAF does not replace security groups or NACLs.
- **[Network Load Balancers](/resources/networking/network-load-balancer)** — NLBs operate at Layer 4 and do not support AWS WAF.

## Basic example

The simplest WAF configuration uses the default AWS-managed rule groups (`AWSManagedRulesCommonRuleSet` and `AWSManagedRulesKnownBadInputsRuleSet`) with a default action of `Allow` — all traffic passes unless a rule explicitly blocks it.


Example (TypeScript):

```typescript
import { defineConfig, WebAppFirewall, ApplicationLoadBalancer } from 'stacktape';
export default defineConfig(() => {
  const firewall = new WebAppFirewall({
    scope: 'regional'
  });

  const alb = new ApplicationLoadBalancer({
    useFirewall: 'firewall'
  });

  return {
    resources: { firewall, alb }
  };
});
```


The `scope` property determines which AWS service layer the firewall protects. Set it to `'regional'` for resources like [Application Load Balancers](/resources/networking/application-load-balancer), [user auth pools](/resources/security/user-auth-pool), and [HTTP API Gateways](/resources/networking/http-api-gateway). Set it to `'cdn'` for CloudFront-attached resources. The remaining properties — `defaultAction`, `captchaImmunityTime`, `challengeImmunityTime`, `disableMetrics`, and `sampledRequestsEnabled` — have documented defaults; `customResponseBodies` and `tokenDomains` are opt-in.

## Scope

The `scope` property determines which AWS service layer the firewall operates on. Choose the scope that matches your attachment target: `regional` for ALBs, user auth pools, or HTTP API Gateways; `cdn` for CloudFront-attached resources.

| Scope | What it protects | Typical targets |
|---|---|---|
| `regional` | Regional AWS resources in a single region | [Application Load Balancers](/resources/networking/application-load-balancer), [user auth pools](/resources/security/user-auth-pool), [HTTP API Gateways](/resources/networking/http-api-gateway) |
| `cdn` | CloudFront distributions at edge locations worldwide | [Static hosting](/resources/frontend/static-hosting), SSR frontends ([Next.js](/resources/frontend/nextjs), [Astro](/resources/frontend/astro), [Nuxt](/resources/frontend/nuxt), [SvelteKit](/resources/frontend/sveltekit), [SolidStart](/resources/frontend/solidstart), [TanStack Start](/resources/frontend/tanstack-start), [Remix](/resources/frontend/remix)), and resources with CDN enabled |


> **Info:** AWS WAF for CloudFront requires the `us-east-1` region. Use `scope: 'cdn'` when protecting CloudFront-attached resources.


A `regional` firewall inspects requests after they arrive at a regional AWS resource — an ALB, user auth pool, or HTTP API Gateway. A `cdn` firewall inspects requests at CloudFront edge locations worldwide, blocking malicious traffic closer to the client. A `cdn` firewall can block requests before they reach the origin, which can reduce origin load for global traffic.

If a resource supports both a regional attachment point and a CDN attachment point (for example, a resource with both an ALB and CDN enabled), you can attach two separate firewalls — one `regional` on the resource itself and one `cdn` on its CloudFront distribution — for layered protection.

## Rules

Stacktape web application firewall rules control which requests are allowed, blocked, or challenged. Three rule types are available: managed rule groups, custom rule groups, and rate-based rules. When `rules` is omitted, Stacktape applies two AWS-managed rule groups by default: `AWSManagedRulesCommonRuleSet` and `AWSManagedRulesKnownBadInputsRuleSet`. Once you explicitly set `rules`, only your specified rules apply — the defaults are replaced entirely.

Every rule requires a `priority` (number) and a `name` (string). For managed rule groups, `name` is the rule group name used alongside `vendorName`. For custom rule groups and rate-based rules, `name` is an arbitrary identifier. Rules are evaluated in ascending priority order — lower numbers first. Priorities must be unique across all rules in the firewall.

### Managed rule groups

Managed rule groups are pre-built rule sets maintained by AWS or third-party vendors on the AWS Marketplace. They provide broad protection without writing individual rules. AWS publishes groups targeting common threat categories — SQL injection, bot control, IP reputation, and more.


Example (TypeScript):

```typescript
import { defineConfig, WebAppFirewall } from 'stacktape';
export default defineConfig(() => {
  const firewall = new WebAppFirewall({
    scope: 'regional',
    rules: [
      {
        type: 'managed-rule-group',
        properties: {
          name: 'AWSManagedRulesCommonRuleSet',
          vendorName: 'AWS',
          priority: 1
        }
      },
      {
        type: 'managed-rule-group',
        properties: {
          name: 'AWSManagedRulesKnownBadInputsRuleSet',
          vendorName: 'AWS',
          priority: 2
        }
      },
      {
        type: 'managed-rule-group',
        properties: {
          name: 'AWSManagedRulesSQLiRuleSet',
          vendorName: 'AWS',
          priority: 3
        }
      }
    ]
  });

  return {
    resources: { firewall }
  };
});
```


The `vendorName` is `'AWS'` for all AWS-managed rule groups. For third-party groups from the AWS Marketplace, use the vendor's name as listed in the Marketplace.

**Commonly used AWS-managed rule groups:**

| Rule group | Purpose |
|---|---|
| `AWSManagedRulesCommonRuleSet` | General protection: XSS, path traversal, file inclusion, size constraints |
| `AWSManagedRulesKnownBadInputsRuleSet` | Known-bad request patterns and exploit payloads |
| `AWSManagedRulesSQLiRuleSet` | SQL injection patterns in query strings, body, cookies, headers |
| `AWSManagedRulesAmazonIpReputationList` | IPs flagged by Amazon threat intelligence |
| `AWSManagedRulesBotControlRuleSet` | Bot detection and categorization (additional per-request pricing) |


> **Tip:** AWS updates managed rule group contents independently of Stacktape releases. Verify detailed rule coverage in the [AWS WAF managed rule group documentation](https://docs.aws.amazon.com/waf/latest/developerguide/aws-managed-rule-groups-list.html).


**Disabling individual rules within a group:** If a managed rule group produces false positives for your application, use `excludedRules` to disable specific rules by name without removing the entire group. Find rule names in the AWS WAF documentation or in sampled request details in the AWS WAF console.

**Dry-run mode:** Set `overrideAction` to `'Count'` to log matches without blocking — useful for testing a new rule group before enforcing it. When omitted (or set to `'None'`), the group's built-in block/allow actions apply as-is.

### Rate-based rules

Rate-based rules limit the number of requests a single IP address can make within a 5-minute window. When an IP exceeds the threshold, the configured action applies (default: `'Block'`). Once the request rate drops back below the limit, the IP is automatically unblocked.


Example (TypeScript):

```typescript
import { defineConfig, WebAppFirewall } from 'stacktape';
export default defineConfig(() => {
  const firewall = new WebAppFirewall({
    scope: 'regional',
    rules: [
      {
        type: 'managed-rule-group',
        properties: {
          name: 'AWSManagedRulesCommonRuleSet',
          vendorName: 'AWS',
          priority: 1
        }
      },
      {
        type: 'rate-based-rule',
        properties: {
          name: 'rateLimiter',
          priority: 10,
          limit: 2000,
          action: 'Block'
        }
      }
    ]
  });

  return {
    resources: { firewall }
  };
});
```


The `limit` property sets the maximum requests per IP in a rolling 5-minute window. Valid range is 100 to 20,000,000. A value of `2000` means roughly 6–7 requests per second sustained before the action triggers. Start with a conservative limit and tune using `'Count'` mode before enforcing.

The `action` property controls what happens when the limit is exceeded: `'Block'` (default, returns 403), `'Count'` (log only — useful for tuning the threshold), `'Captcha'` (present a CAPTCHA challenge), `'Challenge'` (silent browser verification), or `'Allow'` (explicitly pass — accepted by the type but rarely useful for rate limiting).

**Aggregation mode:** The `aggregateBasedOn` property supports two values: `'IP'` for the direct client IP, and `'FORWARDED_IP'` for an IP address read from a header such as `X-Forwarded-For`. Use `'FORWARDED_IP'` when your service sits behind a proxy or CDN and the direct client IP would be the proxy's address. When using `'FORWARDED_IP'`, configure `forwardedIPConfig` with the `headerName` (typically `X-Forwarded-For`) and a `fallbackBehavior` — `'MATCH'` to apply the rule action when the header is missing, or `'NO_MATCH'` to skip.

### Custom rule groups

Custom rule groups reference a pre-built WAF rule group by ARN. Use these when you have rule groups created outside of Stacktape — through the AWS Console, AWS CLI, or shared by another team.


Example (TypeScript):

```typescript
import { defineConfig, WebAppFirewall } from 'stacktape';
export default defineConfig(() => {
  const firewall = new WebAppFirewall({
    scope: 'regional',
    rules: [
      {
        type: 'custom-rule-group',
        properties: {
          name: 'teamSharedRules',
          priority: 5,
          arn: 'arn:aws:wafv2:eu-west-1:123456789012:regional/rulegroup/my-shared-rules/abc123'
        }
      }
    ]
  });

  return {
    resources: { firewall }
  };
});
```


Like managed rule groups, custom rule groups support `overrideAction` — set to `'Count'` for dry-run mode. When omitted (or set to `'None'`), the group's built-in actions apply as-is.

## Default action

The `defaultAction` property controls what happens to requests that don't match any rule. Two options:

- **`'Allow'`** (default) — all traffic passes through unless a rule explicitly blocks it. Your rules act as a blocklist. This is the recommended setting for most applications.
- **`'Block'`** — all traffic is blocked (returns 403) unless a rule explicitly allows it. Use this for high-security scenarios where you want a strict allowlist. Requires careful rule configuration to avoid blocking legitimate traffic.

Most teams should keep the default `'Allow'`. Switch to `'Block'` only when you have a well-defined set of allowed request patterns — this is uncommon and error-prone for typical web applications.

## Attaching to resources

A Stacktape web application firewall is a standalone resource. To activate it, reference the firewall's resource name from the target resource's firewall configuration. The firewall's `scope` must match the target: `regional` for ALBs, user auth pools, and HTTP API Gateways; `cdn` for CloudFront-attached resources.

### Regional attachment

The WAF source defines `regional` scope for Application Load Balancers, user auth pools, and direct API Gateways. Reference the firewall by its resource name from the target resource's configuration. See each resource's documentation for the specific property name.

| Target | Notes |
|---|---|
| [Application Load Balancer](/resources/networking/application-load-balancer) | Protects all traffic routed through the ALB |
| [User Auth Pool](/resources/security/user-auth-pool) | Inspects requests to the hosted UI and token endpoints |
| [HTTP API Gateway](/resources/networking/http-api-gateway) | Direct regional attachment for HTTP request inspection |

### CDN attachment

Resources that use CloudFront — either natively or through an enabled CDN configuration — can use a `cdn`-scoped firewall. CloudFront-attached resources include [static hosting](/resources/frontend/static-hosting), SSR frontends ([Next.js](/resources/frontend/nextjs), [Astro](/resources/frontend/astro), [Nuxt](/resources/frontend/nuxt), [SvelteKit](/resources/frontend/sveltekit), [SolidStart](/resources/frontend/solidstart), [TanStack Start](/resources/frontend/tanstack-start), [Remix](/resources/frontend/remix)), and resources with CDN enabled such as [Application Load Balancers](/resources/networking/application-load-balancer), [HTTP API Gateways](/resources/networking/http-api-gateway), and [Lambda functions](/resources/compute/lambda-function). See each resource's documentation for the specific firewall configuration property.


> **Warning:** Some resources support both a regional and a CDN attachment point. For example, a resource fronted by both an ALB and CloudFront can have two independent firewalls — one `regional` on the ALB and one `cdn` on the CloudFront distribution. These use separate firewall resources with different scopes.


You can reference the same firewall from multiple target resources, provided each target matches the firewall's scope. For example, a single `regional` firewall can be referenced by multiple ALBs and user auth pools within the same stack.

## Custom response bodies

When a rule blocks a request, AWS WAF returns a generic 403 by default. The `customResponseBodies` property defines named response bodies available to the underlying WAF configuration — useful for APIs that need JSON error responses or websites that want a branded block page.


Example (TypeScript):

```typescript
import { defineConfig, WebAppFirewall } from 'stacktape';
export default defineConfig(() => {
  const firewall = new WebAppFirewall({
    scope: 'regional',
    customResponseBodies: {
      blockedResponse: {
        contentType: 'application/json',
        content: '{"error": "Request blocked by firewall", "code": "WAF_BLOCKED"}'
      }
    }
  });

  return {
    resources: { firewall }
  };
});
```


Each entry maps a key to a content type and body. Supported content types are `application/json`, `text/plain`, and `text/html`. The `WebAppFirewallProps` type exposes the response body map on the firewall but does not expose a per-rule custom response body selector. In AWS WAF, individual rule actions reference custom response bodies via a `CustomResponseBodyKey` field — to wire this up, use [CloudFormation overrides](/configuration/overrides-and-escape-hatches) on the WAF rule action.

## CAPTCHA and challenge immunity

When a rule uses a `'Captcha'` or `'Challenge'` action, the client receives a verification challenge. After solving it, a token is issued and the client doesn't need to re-verify for a configurable period. Most teams won't need to adjust these — the defaults work well for typical web applications.

- **`captchaImmunityTime`** — seconds a solved CAPTCHA stays valid. Default: `300` (5 minutes).
- **`challengeImmunityTime`** — seconds a solved silent challenge stays valid. Default: `300` (5 minutes).

Lower values increase security but may annoy legitimate users on high-frequency pages. Higher values reduce friction but give a wider window for token reuse.

The `tokenDomains` property enables WAF token sharing across multiple domains — if your firewall protects both `api.example.com` and `app.example.com`, add both domains so a challenge solved on one is valid on the other.

## Metrics and request sampling

The `disableMetrics` property defaults to `false` on the firewall and on individual rules, so CloudWatch metrics are published by default. Leave it unset unless you intentionally want to stop publishing WAF metrics — disabling metrics in production removes visibility into firewall activity.

Request sampling (`sampledRequestsEnabled`, defaults to `false`) saves samples of matched requests for inspection in the AWS WAF console. Enable it when debugging rule behavior to identify which requests triggered which rules. Both settings are available at the firewall level and per-rule level.

## Referenceable parameters


## Referenceable Parameters: `web-app-firewall`
These values can be referenced with `$ResourceParam("<<resource-name>>", "<<parameter-name>>")`.

| Parameter | Description | Usage |
| --- | --- | --- |
| `arn` | Arn of the `web-app-firewall`. | `$ResourceParam("<<resource-name>>", "arn")` |
| `scope` | Scope of the `web-app-firewall` (`regional` or `cdn`). | `$ResourceParam("<<resource-name>>", "scope")` |


Use these with the [`$ResourceParam` directive](/configuration/directives) — for example, `$ResourceParam('firewall', 'arn')` returns the WAF ARN for use in [CloudFormation overrides](/configuration/overrides-and-escape-hatches) or [stack outputs](/configuration/variables-and-reuse).

## API Reference


## API Reference: `WebAppFirewallProps`
```typescript
import type { CustomResponseBodies, CustomRuleGroup, ManagedRuleGroup, RateBasedStatement } from 'stacktape';

type WebAppFirewallProps = {
  /** cdn for CloudFront-attached resources, regional for ALBs, User Pools, or direct API Gateways. */
  scope: "cdn" | "regional";
  /** Seconds a solved CAPTCHA stays valid before requiring re-verification. */
  captchaImmunityTime?: number;
  /** Seconds a solved challenge stays valid before requiring re-verification. */
  challengeImmunityTime?: number;
  /** Custom response bodies for Block actions. Map of key → content type + body. */
  customResponseBodies?: CustomResponseBodies;
  /** What happens when no rule matches a request. */
  defaultAction?: "Allow" | "Block";
  /** Disable CloudWatch metrics for the firewall. */
  disableMetrics?: boolean;
  /** Firewall rules: managed rule groups (AWS presets), custom rule groups, or rate-based rules. */
  rules?: Array<WebAppFirewallRules>;
  /** Save samples of matched requests for inspection in the AWS WAF console. */
  sampledRequestsEnabled?: boolean;
  /** Domains accepted in WAF tokens. Enables token sharing across multiple protected websites. */
  tokenDomains?: Array<string>;
};

/** Union choices used by the properties above. */
type WebAppFirewallRules =
  | ManagedRuleGroup
  | CustomRuleGroup
  | RateBasedStatement;
```

| Property | Required | Type | Description | Default |
| --- | --- | --- | --- | --- |
| `scope` | yes | `string: "cdn" \| "regional"` | `cdn` for CloudFront-attached resources, `regional` for ALBs, User Pools, or direct API Gateways. | - |
| `captchaImmunityTime` | no | `number` | Seconds a solved CAPTCHA stays valid before requiring re-verification. | `300` |
| `challengeImmunityTime` | no | `number` | Seconds a solved challenge stays valid before requiring re-verification. | `300` |
| `customResponseBodies` | no | `CustomResponseBodies` | Custom response bodies for `Block` actions. Map of key → content type + body. | - |
| `defaultAction` | no | `string: "Allow" \| "Block"` | What happens when no rule matches a request. **`Allow`** (recommended): Allow all traffic, block only what rules catch.
**`Block`**: Block all traffic, allow only what rules explicitly permit (returns 403). | `Allow` |
| `disableMetrics` | no | `boolean` | Disable CloudWatch metrics for the firewall. | `false` |
| `rules` | no | `Array<managed-rule-group \| custom-rule-group \| rate-based-rule>` | Firewall rules: managed rule groups (AWS presets), custom rule groups, or rate-based rules. If omitted, Stacktape uses `AWSManagedRulesCommonRuleSet` + `AWSManagedRulesKnownBadInputsRuleSet` by default. | - |
| `sampledRequestsEnabled` | no | `boolean` | Save samples of matched requests for inspection in the AWS WAF console. | `false` |
| `tokenDomains` | no | `Array<string>` | Domains accepted in WAF tokens. Enables token sharing across multiple protected websites. | - |


## FAQ

### What rules does Stacktape apply by default?

When you omit the `rules` property, Stacktape configures two AWS-managed rule groups: `AWSManagedRulesCommonRuleSet` and `AWSManagedRulesKnownBadInputsRuleSet`. These provide baseline protection against common web exploits and known-bad request patterns. Once you explicitly set `rules`, only your specified rules apply — the defaults are replaced entirely.

### How much does AWS WAF cost?

AWS WAF charges a monthly fee per web ACL (firewall), plus per-rule-group fees and a per-request inspection charge. Baseline cost is ~$5/month + ~$1 per million requests inspected. Advanced features like Bot Control and Account Takeover Prevention carry additional per-request pricing. See the [AWS WAF pricing page](https://aws.amazon.com/waf/pricing/) for current rates. For broader cost guidance, see [managing costs](/managing-costs/overview).

### Can I attach one firewall to multiple resources?

You can reference the same firewall from multiple target resources, provided each target matches the firewall's scope. For example, a single `regional` firewall can be referenced by multiple [Application Load Balancers](/resources/networking/application-load-balancer) and [user auth pools](/resources/security/user-auth-pool). Reference the same firewall name from each resource's firewall configuration property.

### What's the difference between regional and cdn scope?

A `regional` firewall inspects requests at the AWS region level — after they arrive at an ALB, user auth pool, or HTTP API Gateway. A `cdn` firewall inspects requests at CloudFront edge locations worldwide — before they reach your origin. A `cdn` firewall can block malicious traffic closer to the attacker, reducing origin load for legitimate users. Use `regional` for ALBs, user auth pools, and HTTP API Gateways; use `cdn` for CloudFront-attached resources like static hosting and SSR frontends.

### How do I test WAF rules without blocking real traffic?

Use `overrideAction: 'Count'` on managed or custom rule groups. In count mode, matched requests are logged but not blocked, letting you review what would have been blocked before enforcing. For rate-based rules, set `action: 'Count'` for the same effect. Enable `sampledRequestsEnabled: true` to inspect matched request details in the AWS WAF console. Switch to `'None'` (for rule groups) or `'Block'` (for rate-based rules) once confident.

### Can I use third-party managed rule groups from AWS Marketplace?

Yes. AWS Marketplace vendors publish managed rule groups for specific threat categories — GeoIP blocking, advanced bot detection, API abuse prevention, and more. Subscribe to the rule group in the AWS Marketplace, then reference it with the vendor's name in `vendorName` and the rule group name in `name`. Third-party rule groups carry additional subscription pricing set by the vendor.

### Can I protect an HTTP API Gateway with a WAF?

Yes. The WAF `scope` property supports HTTP API Gateways as a `regional` target, so you can attach a `regional`-scoped firewall directly to an [HTTP API Gateway](/resources/networking/http-api-gateway). Alternatively, if the gateway has CDN enabled, you can attach a `cdn`-scoped firewall at the CloudFront layer for edge-level filtering. Use a WAF when API Gateway's built-in throttling isn't sufficient — for example, when you need HTTP request inspection for SQL injection, XSS, or bot detection.

### WAF vs security groups — when do I need each?

Security groups operate at Layer 3/4 (IP addresses and ports) and control which network connections can reach your resources. AWS WAF operates at Layer 7 (HTTP) and inspects request content — headers, query strings, body, and URI paths. They serve different purposes and are complementary. Security groups block unauthorized network access; WAF blocks malicious HTTP requests from authorized network sources. Most production stacks benefit from both.

### How do I handle false positives from managed rule groups?

Use the `excludedRules` property on a managed rule group to disable specific rules by name without removing the entire group. First, enable `sampledRequestsEnabled` to identify which rule is triggering on legitimate requests. Then add that rule's name to `excludedRules`. Find rule names in the AWS WAF documentation for each managed rule group, or in the sampled request details in the AWS WAF console.

### How does the default action interact with rules?

The `defaultAction` is a catch-all for requests that don't match any rule. With `'Allow'` (default), unmatched requests pass through — your rules function as a blocklist. With `'Block'`, unmatched requests get a 403 — your rules must explicitly allow legitimate traffic. Most applications use `'Allow'` because writing a complete allowlist is error-prone. Use `'Block'` only in high-security contexts where you can precisely define every valid request pattern.
