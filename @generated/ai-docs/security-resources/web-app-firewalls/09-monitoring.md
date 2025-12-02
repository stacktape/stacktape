# Monitoring

You can monitor your firewall and its rules using Amazon CloudWatch and the AWS WAF console. By default, metrics and sampled requests are enabled for the firewall as a whole but disabled for individual rules. You can change this behavior using the `metricsEnabled` and `sampledRequestsEnabled` properties.

Stacktape will automatically create links to the AWS WAF console and the CloudWatch metrics dashboard in the Stacktape Console.

For more details, see the AWS documentation on [metrics](https://docs.aws.amazon.com/waf/latest/developerguide/web-acl-testing-view-metrics.html) and [sampled requests](https://docs.aws.amazon.com/waf/latest/developerguide/web-acl-testing-view-sample.html).