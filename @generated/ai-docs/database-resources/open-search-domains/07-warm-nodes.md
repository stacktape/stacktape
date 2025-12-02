# Warm nodes

Warm nodes provide a cost-effective way to store large amounts of read-only data.

```yaml
resources:
  myOpenSearch:
    type: open-search-domain
    properties:
      version: "2.17"
      clusterConfig:
        instanceType: r6g.large.search
        instanceCount: 3
        # {start-highlight}
        warmType: ultrawarm1.medium.search
        warmCount: 2
        # {stop-highlight}
```