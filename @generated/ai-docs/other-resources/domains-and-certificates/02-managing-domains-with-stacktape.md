# Managing domains with Stacktape

If you use Route 53 as your DNS provider, you can use the `stacktape domain:add` command to prepare your domain for use with Stacktape. This command will guide you through creating TLS certificates and, optionally, configuring AWS SES for your domain.

You only need to run this command once per region for each domain.

```bash
stacktape domain:add --region <<region>>
```

After the command completes successfully, you can use your domain and its subdomains in your Stacktape configuration. Stacktape will automatically create the necessary DNS records and assign the correct certificates during deployment.

```yml
resources:
  apiService:
    type: web-service
    properties:
      # ...
      # {start-highlight}
      customDomains:
        - domainName: api.mydomain.com
      # {stop-highlight}

  web:
    type: hosting-bucket
    properties:
      # ...
      # {start-highlight}
      customDomains:
        - domainName: mydomain.com
      # {stop-highlight}
```