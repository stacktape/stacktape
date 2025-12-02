# Using Stacktape to manage domains and certs

```yaml
resources:
  myHttpApi:
    type: 'http-api-gateway'
    properties:
      # {start-highlight}
      customDomains:
        - domainName: whatever.mydomain.com
      # {stop-highlight}
```