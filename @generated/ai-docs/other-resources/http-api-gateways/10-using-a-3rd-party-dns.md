# Using a 3rd-party DNS

To use a domain from a provider like GoDaddy or Cloudflare:

1.  Create or import a TLS certificate for your domain in the [AWS Certificate Manager console](https://console.aws.amazon.com/acm/home#/certificates/list) and copy its _ARN_.
2.  Add the `customDomains` configuration to your API gateway, using the certificate _ARN_ and disabling DNS record creation.

```yml
resources:
  myWebsite:
    type: http-api-gateway
    properties:
      # {start-highlight}
      customDomains:
        - domainName: mydomain.com
          disableDnsRecordCreation: true
          customCertificateArn: <<ARN_OF_YOUR_CERTIFICATE>>
      # {stop-highlight}
```

3.  After deploying, find the API gateway's domain name in the [Stacktape Console](https://console.stacktape.com/projects).
4.  In your DNS provider's dashboard, create a `CNAME` or `ALIAS` record pointing to the API gateway's domain name.