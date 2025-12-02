# Default rules

If you don't specify any rules, Stacktape applies a default set of managed rules from AWS that protect against common attacks, including those listed in the [OWASP Top 10](https://owasp.org/www-project-top-ten/). These rules protect against vulnerabilities like SQL injection and cross-site scripting (XSS).

Specifically, it uses the following rule groups:

-   **Common rule set (AWSManagedRulesCommonRuleSet):** Protects against a wide range of common vulnerabilities.
-   **Known bad inputs (AWSManagedRulesKnownBadInputsRuleSet):** Blocks request patterns that are known to be malicious.

You can find more information about these rule groups in the [AWS documentation](https://docs.aws.amazon.com/waf/latest/developerguide/aws-managed-rule-groups-baseline.html).