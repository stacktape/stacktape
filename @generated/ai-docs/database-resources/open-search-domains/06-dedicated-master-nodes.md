# Dedicated master nodes

For production environments, it's recommended to use dedicated master nodes to improve cluster stability.

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
        dedicatedMasterType: r6g.large.search
        dedicatedMasterCount: 3
        # {stop-highlight}
```