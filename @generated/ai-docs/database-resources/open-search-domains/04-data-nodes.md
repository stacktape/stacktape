# Data nodes

You can configure the instance type and number of data nodes in your cluster.

```yaml
resources:
  myOpenSearch:
    type: open-search-domain
    properties:
      clusterConfig:
        # {start-highlight}
        instanceType: r6g.large.search
        instanceCount: 3
        # {stop-highlight}
```