# Using a 3rd-party DNS

If you manage your DNS records with a third-party provider, you must create or import a custom TLS certificate in the [AWS Certificate Manager console](https://console.aws.amazon.com/acm/home#/certificates/list).

You can then reference the certificate's _ARN_ in your Stacktape configuration. Remember to disable DNS record creation, as Stacktape does not have control over your DNS records in this setup.

```yml
resources:
  apiService:
    type: web-service
    properties:
      # ...
      # {start-highlight}
      customDomains:
        - domainName: mydomain.com
          disableDnsRecordCreation: true
          customCertificateArn: <<ARN_OF_YOUR_CERTIFICATE>>
      # {stop-highlight}
```

After deploying, you will need to create a `CNAME` or `ALIAS` record in your DNS provider's dashboard that points to the domain of the created resource. You can find the resource's domain in the [Stacktape Console](https://console.stacktape.com/).