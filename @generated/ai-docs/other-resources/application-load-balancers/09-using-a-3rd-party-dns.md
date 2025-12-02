# Using a 3rd-party DNS

To use a domain from a provider like GoDaddy or Cloudflare:

1.  Create or import a TLS certificate for your domain in the [AWS Certificate Manager console](https://console.aws.amazon.com/acm/home#/certificates/list) and copy its _ARN_.
2.  Configure a listener on your load balancer to use the custom certificate.
3.  After deploying, find the ALB's domain name in the [Stacktape Console](https://console.stacktape.com/projects).
4.  In your DNS provider's dashboard, create a `CNAME` or `ALIAS` record pointing to the ALB's domain name.

```yaml
resources:
  myLoadBalancer:
    type: 'application-load-balancer'
    properties:
      listeners:
        - port: 443
          protocol: HTTPS
          # {start-highlight}
          customCertificateArns:
            - arn:aws:acm:eu-west-1:999999999999:certificate/8ab817b5-c4fa-4b1d-8b72-d6082cb40351
          # {stop-highlight}
        - port: 80
          protocol: HTTP
          defaultAction:
            type: redirect
            properties:
              statusCode: HTTP_301
              protocol: HTTPS
```

> A custom HTTPS listener with a custom certificate and an automatic redirect from HTTP to HTTPS.