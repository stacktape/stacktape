# Web application firewall

A web application firewall (AWS WAF) inspects HTTP requests before they reach your app and blocks common attacks:
SQL injection, cross-site scripting, known bad inputs and floods from one IP address. You define it as its own
resource and attach it to a load balancer, a CDN, a website or a user pool.

A firewall with the two default rule groups costs about $7 a month ($5 for the firewall and $1 per rule group) plus
$0.60 per million requests ([AWS WAF pricing](https://aws.amazon.com/waf/pricing/)). Bot Control and other paid rule
groups add their own fees.

## Basic example


Example (TypeScript):

```typescript
import { defineConfig, WebAppFirewall } from 'stacktape';
export default defineConfig(() => {
  const firewall = new WebAppFirewall({
    scope: 'regional'
  });

  return {
    resources: { firewall }
  };
});
```


With no `rules`, the firewall uses two AWS-managed rule groups, `AWSManagedRulesCommonRuleSet` and
`AWSManagedRulesKnownBadInputsRuleSet`, and lets through every request they don't block. Attach it by name from the
resource it protects:

| Scope | Attach it with | To |
|---|---|---|
| `regional` | `useFirewall` | [Application Load Balancer](/resources/networking/application-load-balancer), [web service](/resources/compute/web-service) with an Application Load Balancer, [user auth pool](/resources/security/user-auth-pool) |
| `cdn` | `cdn.useFirewall` or `useFirewall` | [CDN](/resources/networking/cdn), the CDN of a load balancer, HTTP API Gateway, function or bucket, [static hosting](/resources/frontend/static-hosting) and the SSR frontends |

`scope` is required. A `cdn` firewall works at CloudFront locations and stops bad requests before they reach your
region; Stacktape creates it in `us-east-1`, where AWS keeps CloudFront firewalls. A firewall can't change scope after
its first deploy, so create a new one instead.

HTTP API Gateways and Network Load Balancers can't take a firewall directly. Put a CDN in front of an HTTP API Gateway
and attach a `cdn` firewall to it.

## Rules

Three rule types: managed rule groups, rate-based rules and custom rule groups. Each rule has a `name` and a unique
`priority`; lower priorities run first. Setting `rules` replaces the defaults, so list the default groups again if you
want to keep them.

### Managed rule groups

Managed rule groups are rule sets maintained by AWS or by vendors on AWS Marketplace. For AWS groups, set
`vendorName: 'AWS'`.


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


| Rule group | Blocks |
|---|---|
| `AWSManagedRulesCommonRuleSet` | Cross-site scripting, path traversal, file inclusion, oversized requests |
| `AWSManagedRulesKnownBadInputsRuleSet` | Known exploit payloads |
| `AWSManagedRulesSQLiRuleSet` | SQL injection in the query, body, cookies and headers |
| `AWSManagedRulesAmazonIpReputationList` | IP addresses Amazon threat intelligence flags |
| `AWSManagedRulesBotControlRuleSet` | Bots, by category (extra monthly and per-request fees) |

AWS changes the rules inside these groups over time; see the
[AWS list of managed rule groups](https://docs.aws.amazon.com/waf/latest/developerguide/aws-managed-rule-groups-list.html).

To try a group without blocking anything, set `overrideAction: 'Count'`: matching requests are only counted. `'None'`
enforces the group. If one rule of a group blocks legitimate requests, list it in `excludedRules`; you find its name in
the sampled requests in the AWS WAF console.

### Rate-based rules

A rate-based rule limits how many requests one IP address can send in a rolling five-minute window.


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


`limit` takes 100 to 20,000,000. 2,000 means about 6 to 7 requests per second, sustained. `action` is `'Block'` (a 403
response) by default; `'Count'` only counts, which helps you find the right limit, and `'Captcha'` or `'Challenge'`
make the client prove it's a browser.

Behind a proxy or CDN, every request comes from the proxy's address. Set `aggregateBasedOn: 'FORWARDED_IP'` and
`forwardedIPConfig` with the header (usually `X-Forwarded-For`) and a `fallbackBehavior` for requests without it
(`'MATCH'` or `'NO_MATCH'`).

### Custom rule groups

A custom rule group uses a WAF rule group that already exists in your account, by ARN, for example one another team
maintains. It takes `overrideAction` like a managed group.


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


## Default action

`defaultAction` decides what happens to requests no rule matched. `'Allow'` (default) makes your rules a blocklist.
`'Block'` returns 403 for everything your rules don't allow, which suits only APIs with a small, known set of allowed
requests.

## Custom response bodies

A blocked request gets a plain 403 by default. `customResponseBodies` defines named bodies, for example a JSON error
for an API or an HTML page for a website. `contentType` is `application/json`, `text/plain` or `text/html`.


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


The rule types here don't select a body per rule. For that and other WAF settings Stacktape doesn't expose, use
[overrides](/configuration/overrides-and-escape-hatches).

## CAPTCHA and challenge immunity

After a client solves a `'Captcha'` or `'Challenge'`, it isn't asked again for `captchaImmunityTime` or
`challengeImmunityTime` seconds (300 by default). `tokenDomains` lets several of your domains accept the same token.

## Metrics and request sampling

Each firewall and rule publishes CloudWatch metrics unless `disableMetrics: true`. `sampledRequestsEnabled: true`
keeps samples of matched requests to inspect in the AWS WAF console, which is how you find false positives. Both can
be set on the firewall and on each rule.

## Configuration reference


### Definition: `WebAppFirewallProps`

The complete property-level reference is included in `llms-api-reference.txt` and indexed under route `/config-reference/web-app-firewall` with definition name `WebAppFirewallProps`.

| Property | Required | Type | Default |
| --- | --- | --- | --- |
| `scope` | yes | `string: "cdn" \| "regional"` | - |
| `captchaImmunityTime` | no | `number` | `300` |
| `challengeImmunityTime` | no | `number` | `300` |
| `customResponseBodies` | no | `CustomResponseBodies` | - |
| `defaultAction` | no | `string: "Allow" \| "Block"` | `Allow` |
| `disableMetrics` | no | `boolean` | `false` |
| `rules` | no | `Array<managed-rule-group \| custom-rule-group \| rate-based-rule>` | - |
| `sampledRequestsEnabled` | no | `boolean` | `false` |
| `tokenDomains` | no | `Array<string>` | - |


## Referenceable parameters


## Referenceable Parameters: `web-app-firewall`
These values can be referenced with `$ResourceParam("<<resource-name>>", "<<parameter-name>>")`.

| Parameter | Description | Usage |
| --- | --- | --- |
| `arn` | Arn of the `web-app-firewall`. | `$ResourceParam("<<resource-name>>", "arn")` |
| `scope` | Scope of the `web-app-firewall` (`regional` or `cdn`). | `$ResourceParam("<<resource-name>>", "scope")` |
