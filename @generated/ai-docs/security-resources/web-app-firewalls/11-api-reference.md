# API Reference

TypeScript type definitions for this resource.

```typescript
// From stacktape-config/web-app-firewall.d.ts
/**
 * #### Web Application Firewall
 *
 * ---
 *
 * A firewall that helps protect your resources from common web exploits that could affect application availability, compromise security, or consume excessive resources.
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
   * #### Specifies whether this firewall is to be used with a CDN or with regional resources.
   *
   * ---
   *
   * - Use `cdn` if you are using the firewall with a CDN-enabled resource (e.g., HTTP API Gateway, Bucket, Application Load Balancer, or Web Service).
   * - Use `regional` if you are using the firewall directly with a regional resource (e.g., Application Load Balancer, User Pool, or Web Service).
   */
  scope: 'regional' | 'cdn';
  /**
   * #### The default action for the firewall if no rule matches.
   *
   * ---
   *
   * - **`Allow`**: Allows most users to access your website but blocks attackers whose requests match specific rules (e.g., originate from certain IP addresses or contain malicious SQL code).
   * - **`Block`**: Prevents most users from accessing your website but allows users whose requests match specific rules. By default, the `Block` action responds with an HTTP `403 (Forbidden)` status code.
   *
   * @default Allow
   */
  defaultAction?: 'Allow' | 'Block';
  /**
   * #### A list of rules to be used by the firewall.
   *
   * ---
   *
   * A rule can be a reference to a `managed-rule-group`, a user-defined `custom-rule-group`, or a `rate-based-rule`.
   *
   * - **`managed-rule-group`**: A pre-configured rule group created by AWS or other vendors for specific use cases. For more details, see the [AWS documentation](https://docs.aws.amazon.com/waf/latest/developerguide/aws-managed-rule-groups-list.html).
   * - **`custom-rule-group`**: A custom rule group that you have created.
   * - **`rate-based-rule`**: Tracks the rate of requests for each originating IP address and triggers an action when the rate exceeds a specified limit within a five-minute period.
   *
   * If you do not specify any rules, Stacktape will use the `AWSManagedRulesCommonRuleSet` and `AWSManagedRulesKnownBadInputsRuleSet` managed rule groups to protect your application.
   */
  rules?: (ManagedRuleGroup | CustomRuleGroup | RateBasedStatement)[];
  /**
   * #### A map of custom response keys and content bodies.
   *
   * ---
   *
   * When you create a rule with a `Block` action, you can send a custom response to the web request.
   */
  customResponseBodies?: CustomResponseBodies;
  /**
   * #### Determines how long (in seconds) a solved CAPTCHA challenge remains valid.
   *
   * ---
   *
   * For more details, see the [AWS documentation](https://docs.aws.amazon.com/waf/latest/developerguide/waf-tokens-immunity-times.html).
   *
   * @default 300
   */
  captchaImmunityTime?: number;
  /**
   * #### Determines how long (in seconds) a solved challenge remains valid.
   *
   * ---
   *
   * For more details, see the [AWS documentation](https://docs.aws.amazon.com/waf/latest/developerguide/waf-tokens-immunity-times.html).
   *
   * @default 300
   */
  challengeImmunityTime?: number;
  /**
   * #### Specifies the domains that the firewall should accept in a web request token.
   *
   * ---
   *
   * This enables the use of tokens across multiple protected websites.
   * For more details, see the [AWS documentation](https://docs.aws.amazon.com/waf/latest/developerguide/waf-tokens-domains.html#waf-tokens-domain-lists).
   */
  tokenDomains?: string[];
  /**
   * #### When `true`, disables the collection of metrics for the firewall.
   *
   * ---
   *
   * By default, total metrics for the firewall are enabled and can be monitored using AWS CloudWatch or the AWS WAF console.
   *
   * @default false
   */
  disableMetrics?: boolean;
  /**
   * #### When `true`, requests matching the rule are saved for further analysis.
   *
   * ---
   *
   * By default, sampled requests are not saved.
   * If you set this to `true`, requests that match the rule will be stored and can be viewed in the AWS WAF console.
   *
   * @default false
   */
  sampledRequestsEnabled?: boolean;
}

interface CommonRuleProps {
  /**
   * #### The priority of the rule.
   *
   * ---
   *
   * Rules are evaluated in order of priority, with lower values being evaluated first.
   * Priorities do not need to be consecutive, but they must be unique.
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
   * #### When `true`, disables metrics for the rule.
   *
   * ---
   *
   * @default false
   */
  disableMetrics?: boolean;
  /**
   * #### When `true`, requests matching the rule are saved for further analysis.
   *
   * ---
   *
   * By default, sampled requests are not saved.
   * You can view sampled requests in the AWS WAF console.
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
   * #### The name of the rule group's vendor.
   */
  vendorName: string;
  /**
   * #### A list of rules to be excluded from the specified rule group.
   */
  excludedRules?: string[];
  /**
   * #### An action to override the result of the rule group evaluation.
   *
   * ---
   *
   * Set this to `None` to leave the result of the rule group unchanged, or set it to `Count` to override the result to count only.
   */
  overrideAction?: 'None' | 'Count';
}

interface CustomRuleGroup {
  type: 'custom-rule-group';
  properties: CustomRuleGroupProps;
}

interface CustomRuleGroupProps extends CommonRuleProps {
  /**
   * #### The Amazon Resource Name (ARN) of the rule group.
   *
   * ---
   *
   * For more information on how to create a custom rule group, see the [AWS documentation](https://docs.aws.amazon.com/waf/latest/developerguide/working-with-rule-groups.html).
   */
  arn: string;
  /**
   * #### An action to override the result of the rule group evaluation.
   *
   * ---
   *
   * Set this to `None` to leave the result of the rule group unchanged, or set it to `Count` to override the result to count only.
   */
  overrideAction?: 'None' | 'Count';
}

interface RateBasedStatement {
  type: 'rate-based-rule';
  properties: RateBasedStatementProps;
}

interface RateBasedStatementProps extends CommonRuleProps {
  /**
   * #### The maximum number of requests from a single IP address allowed in a five-minute period.
   *
   * ---
   *
   * The limit must be between 100 and 20,000,000.
   */
  limit: number;
  /**
   * #### The type of aggregation to use for this rule.
   *
   * ---
   *
   * - `IP`: Aggregates request counts based on the IP addresses of the requests.
   * - `FORWARDED_IP`: Aggregates request counts based on the IP addresses in a specified header.
   *
   * If you choose `FORWARDED_IP`, you can also specify the `headerName` and `fallbackBehavior` in the `forwardedIPConfig` property.
   * By default, these are `X-Forwarded-For` and `NO_MATCH`, respectively.
   *
   * For more details on rate-based rules, see the [AWS documentation](https://docs.aws.amazon.com/waf/latest/APIReference/API_RateBasedStatement.html).
   */
  aggregateBasedOn?: 'IP' | 'FORWARDED_IP';
  /**
   * #### The configuration for inspecting IP addresses in a specified HTTP header.
   *
   * ---
   *
   * - `fallbackBehavior`: Specifies what to do when a web request does not include the specified header.
   *   - `MATCH`: Treats the web request as matching the statement.
   *   - `NO_MATCH`: Treats the web request as not matching the statement.
   * - `headerName`: The name of the HTTP header to use for the IP address.
   *
   * For more details, see the [AWS documentation](https://docs.aws.amazon.com/waf/latest/APIReference/API_ForwardedIPConfig.html).
   */
  forwardedIPConfig?: ForwardedIPConfig;
  /**
   * #### The action that the firewall should take when a web request matches the rule's statement.
   *
   * ---
   *
   * - `Allow`: Allows the web request.
   * - `Block`: Blocks the web request.
   * - `Count`: Counts the web request and allows it.
   * - `Captcha`: Returns a CAPTCHA challenge to the client.
   * - `Challenge`: Returns a challenge to the client.
   *
   * For more details, see the [AWS documentation](https://docs.aws.amazon.com/waf/latest/APIReference/API_RuleAction.html).
   *
   * @default Block
   */
  action?: 'Allow' | 'Block' | 'Count' | 'Captcha' | 'Challenge';
}

interface ForwardedIPConfig {
  /**
   * #### The fallback behavior to use when the specified header is not present.
   *
   * ---
   *
   * - `MATCH`: Treats the web request as matching the rule statement, and the firewall applies the rule's action.
   * - `NO_MATCH`: Treats the web request as not matching the rule statement.
   */
  fallbackBehavior: 'MATCH' | 'NO_MATCH';
  /**
   * #### The name of the HTTP header to use for the IP address.
   *
   * ---
   *
   * For example, if you specify `X-Forwarded-For`, the firewall will inspect the `X-Forwarded-For` header in the web request.
   */
  headerName: string;
}

interface CustomResponseBodies {
  [key: string]: {
    /**
     * #### The content type of the custom response.
     *
     * ---
     *
     * - `application/json`: The custom response is a JSON string.
     * - `text/plain`: The custom response is a plain text string.
     * - `text/html`: The custom response is a block of HTML code.
     */
    contentType: string;
    /**
     * #### The body of the custom response.
     */
    content: string;
  };
}

type WebAppFirewallReferencableParams = 'arn' | 'scope';
```