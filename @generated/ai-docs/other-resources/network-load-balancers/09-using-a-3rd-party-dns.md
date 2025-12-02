# Using a 3rd-party DNS

To use a domain from a provider like GoDaddy or Cloudflare:

1.  Create or import a TLS certificate for your domain in the [AWS Certificate Manager console](https://console.aws.amazon.com/acm/home#/certificates/list) and copy its _ARN_.
2.  Configure a listener on your load balancer to use the custom certificate.
3.  After deploying, find the NLB's domain name in the [Stacktape Console](https://console.stacktape.com/projects).
4.  In your DNS provider's dashboard, create a `CNAME` or `ALIAS` record pointing to the NLB's domain name.

```yaml
resources:
  myLoadBalancer:
    type: 'network-load-balancer'
    properties:
      listeners:
        - port: 8080
          protocol: TLS
          # {start-highlight}
          customCertificateArns:
            - arn:aws:acm:eu-west-1:999999999999:certificate/8ab817b5-c4fa-4b1d-8b72-d6082cb40351
          # {stop-highlight}

  myWorkload:
    type: 'multi-container-workload'
    properties:
      containers:
        - name: container1
          packaging:
            type: stacktape-image-buildpack
            properties:
              entryfilePath: containers/ts-container.ts
          events:
            - type: network-load-balancer
              properties:
                loadBalancerName: myLoadBalancer
                listenerPort: 8080
                containerPort: 8080
      resources:
        cpu: 0.25
        memory: 512
```