# Disable Multi-AZ awareness

You can disable Multi-AZ awareness if you don't need the high availability features.

```yml
resources:
  myOpenSearch:
    type: open-search-domain
    properties:
      version: "2.17"
      clusterConfig:
        instanceType: r6g.large.search
        instanceCount: 3
        # {start-highlight}
        multiAzDisabled: true
        # {stop-highlight}
```