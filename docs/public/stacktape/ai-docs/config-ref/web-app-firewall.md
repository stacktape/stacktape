---
docType: config-ref
title: Web App Firewall
resourceType: web-app-firewall
tags:
  - web-app-firewall
  - waf
  - firewall
source: types/stacktape-config/web-app-firewall.d.ts
priority: 1
---

# Web App Firewall

Protects your APIs and websites from common attacks (SQL injection, XSS, bots, DDoS).

Attach to an HTTP API Gateway, Application Load Balancer, or CDN. Comes with AWS-managed rule sets
by default. Costs ~$5/month base + $1/million requests inspected.

Resource type: `web-app-firewall`

## TypeScript Definition

```typescript
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

interface WebAppFirewallProps {
  /**
   * #### `cdn` for CloudFront-attached resources, `regional` for ALBs, User Pools, or direct API Gateways.
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
   * @default Allow
   */
  defaultAction?: 'Allow' | 'Block';
  /**
   * #### Firewall rules: managed rule groups (AWS presets), custom rule groups, or rate-based rules.
   *
   * ---
   *
   * If omitted, Stacktape uses `AWSManagedRulesCommonRuleSet` + `AWSManagedRulesKnownBadInputsRuleSet` by default.
   */
  rules?: (ManagedRuleGroup | CustomRuleGroup | RateBasedStatement)[];
  /**
   * #### Custom response bodies for `Block` actions. Map of key → content type + body.
   */
  customResponseBodies?: CustomResponseBodies;
  /**
   * #### Seconds a solved CAPTCHA stays valid before requiring re-verification.
   * @default 300
   */
  captchaImmunityTime?: number;
  /**
   * #### Seconds a solved challenge stays valid before requiring re-verification.
   * @default 300
   */
  challengeImmunityTime?: number;
  /**
   * #### Domains accepted in WAF tokens. Enables token sharing across multiple protected websites.
   */
  tokenDomains?: string[];
  /**
   * #### Disable CloudWatch metrics for the firewall.
   * @default false
   */
  disableMetrics?: boolean;
  /**
   * #### Save samples of matched requests for inspection in the AWS WAF console.
   * @default false
   */
  sampledRequestsEnabled?: boolean;
}

interface CommonRuleProps {
  /**
   * #### Evaluation order. Lower = evaluated first. Must be unique across all rules.
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
   * @default false
   */
  disableMetrics?: boolean;
  /**
   * #### Save samples of requests matching this rule for inspection in the WAF console.
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
   */
  vendorName: string;
  /**
   * #### Rules within this group to skip (by rule name). Useful for disabling false positives.
   */
  excludedRules?: string[];
  /**
   * #### `None` = apply normally, `Count` = log matches without blocking (dry-run mode).
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
   */
  arn: string;
  /**
   * #### `None` = apply normally, `Count` = log matches without blocking (dry-run mode).
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
   */
  limit: number;
  /**
   * #### `IP` = direct client IP, `FORWARDED_IP` = IP from a header (e.g., `X-Forwarded-For` behind a proxy).
   */
  aggregateBasedOn?: 'IP' | 'FORWARDED_IP';
  /**
   * #### Header and fallback settings when using `FORWARDED_IP` aggregation.
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
   * @default Block
   */
  action?: 'Allow' | 'Block' | 'Count' | 'Captcha' | 'Challenge';
}

interface ForwardedIPConfig {
  /**
   * #### What to do when the header is missing. `MATCH` = apply rule action, `NO_MATCH` = skip.
   */
  fallbackBehavior: 'MATCH' | 'NO_MATCH';
  /**
   * #### HTTP header containing the client IP (e.g., `X-Forwarded-For`).
   */
  headerName: string;
}

interface CustomResponseBodies {
  [key: string]: {
    /**
     * #### MIME type: `application/json`, `text/plain`, or `text/html`.
     */
    contentType: string;
    /**
     * #### Response body content.
     */
    content: string;
  };
}

type WebAppFirewallReferencableParams = 'arn' | 'scope';
```
