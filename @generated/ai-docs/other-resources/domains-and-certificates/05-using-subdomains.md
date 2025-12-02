# Using subdomains

You can use subdomains with your resources, and you can use variables to create dynamic subdomain names based on the stage.

```yaml
resources:
  myHttpApi:
    type: 'http-api-gateway'
    properties:
      # {start-highlight}
      customDomains:
        - domainName: $Format('{}.mydomain.com', $Stage())
      # {stop-highlight}
```