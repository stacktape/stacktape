# Logging

You can enable and configure logging for your OpenSearch domain.

```yaml
resources:
  myOpenSearch:
    type: open-search-domain
    properties:
      logging:
        errorLogs:
          retentionDays: 30
        searchSlowLogs:
          retentionDays: 14
        indexSlowLogs:
          disabled: true
```