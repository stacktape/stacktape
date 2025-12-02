# Multi-AZ with standby

You can enable a multi-AZ deployment with a standby Availability Zone for high availability.

```yaml
resources:
  myOpenSearch:
    type: open-search-domain
    properties:
      version: "2.17"
      clusterConfig:
        instanceType: r6g.large.search
        instanceCount: 3
        dedicatedMasterType: r6g.large.search
        dedicatedMasterCount: 3
        # {start-highlight}
        standbyEnabled: true
        # {stop-highlight}
```