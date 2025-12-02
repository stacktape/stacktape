# Storage

You can configure the storage for your OpenSearch domain using EBS volumes.

```yaml
resources:
  myOpenSearch:
    type: open-search-domain
    properties:
      clusterConfig:
        instanceType: r6g.large.search
        instanceCount: 3
      # {start-highlight}
      storage:
        size: 100
        iops: 3000
        throughput: 200
      # {stop-highlight}
```