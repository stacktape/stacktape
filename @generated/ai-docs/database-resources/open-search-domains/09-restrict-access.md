# Restrict access

You can restrict access to your OpenSearch domain to a specific _VPC_.

```yaml
resources:
  myOpenSearch:
    type: open-search-domain
    properties:
      accessibility:
        accessibilityMode: vpc
```