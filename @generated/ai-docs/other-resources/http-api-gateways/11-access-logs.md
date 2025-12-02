# Access logs

Access logs contain basic information about requests to your API gateway, which can be useful for auditing and compliance. Stacktape enables access logging by default, with a retention period of 30 days.

```yaml
resources:
  myHttpApi:
    type: 'http-api-gateway'
    properties:
      # {start-highlight}
      logging:
        format: CSV
      # {stop-highlight}
```