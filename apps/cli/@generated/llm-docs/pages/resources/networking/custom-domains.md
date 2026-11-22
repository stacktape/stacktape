# Custom domains

A custom domain serves a resource at your own address, such as `api.example.com`, instead of the hostname AWS
generates. You need a domain you already own. With its DNS in Route 53, Stacktape finds the certificate and creates the
DNS record on every deploy. You can also [keep DNS at your current provider](#external-dns).

Without a custom domain, every resource still gets an HTTPS URL from AWS, which is enough for development stages.

## Set up the domain

Do this once per root domain and AWS region, before the first deploy that uses the domain.

1. Run `stacktape domain add` with the region you deploy to and enter the domain when it asks:

   ```bash
   stacktape domain add --region eu-west-1
   ```

   If the domain's DNS isn't in Route 53 yet, the command offers to create a hosted zone for the root domain and prints
   its name servers.

2. If the domain already serves traffic, copy its existing DNS records into the new hosted zone first (see the
   [AWS migration steps](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/migrate-dns-domain-in-use.html)).
   Then set the printed name servers at your registrar. Your registrar keeps the registration.
3. When the name servers have changed, run `stacktape domain add` again. It requests free ACM certificates in your
   region and in `us-east-1` (CDNs and AppSync use `us-east-1`) and adds their validation records to the zone.
4. Wait until the certificates show **Issued** in ACM, usually a few minutes after the validation records exist.

For a root domain such as `example.com`, the certificates cover `example.com` and `*.example.com`. A wildcard covers
one level only, so for `api.dev.example.com` enter that full name in `stacktape domain add` to get a certificate for
it. The command still uses the `example.com` zone.

## Basic example


Example (TypeScript):

```typescript
import { defineConfig, HttpApiGateway } from 'stacktape';
export default defineConfig(() => {
  const myApi = new HttpApiGateway({
    customDomains: [{ domainName: 'api.example.com' }]
  });

  return {
    resources: { myApi }
  };
});
```


The deploy attaches the issued certificate that covers `api.example.com` and creates the DNS record in the
`example.com` zone. Open `https://api.example.com` after the deploy finishes. If no issued certificate covers the name,
the deploy stops before changing anything and says which certificate is missing.

Write `domainName` without a protocol: `api.example.com`, not `https://api.example.com`.

To give each stage its own hostname, build the name from the stage, for example `api-staging.example.com` for staging
and `api.example.com` for production. Every hostname must be covered by a certificate.

## Supported resources

These resources take a `customDomains` list with the same three fields: `domainName`, `customCertificateArn` and
`disableDnsRecordCreation`.

| Resource | Typical hostname |
|---|---|
| [HTTP API Gateway](/resources/networking/http-api-gateway) | `api.example.com` for Lambda APIs |
| [WebSocket API Gateway](/resources/networking/websocket-api-gateway) | `realtime.example.com` |
| [Application Load Balancer](/resources/networking/application-load-balancer) | `app.example.com` for containers |
| [Network Load Balancer](/resources/networking/network-load-balancer) | TCP or TLS services |
| [CDN](/resources/networking/cdn) | `www.example.com` in front of a bucket, a load balancer, an API or a function |

[Web services](/resources/compute/web-service), [static hosting](/resources/frontend/static-hosting) and the SSR
frontends accept `customDomains` on the resource itself. [AppSync APIs](/resources/networking/appsync-api) and
[user auth pools](/resources/security/user-auth-pool) take a single `customDomain`.

One API Gateway hostname can't serve both a WebSocket API and an HTTP API. Use two names, such as `api.example.com` and
`realtime.example.com`; Stacktape rejects the config before deploying.

## TLS certificates

Leave out `customCertificateArn` and Stacktape picks the most specific issued certificate that covers the hostname: an
exact match first, then a wildcard. Set `customCertificateArn` to use a certificate you manage yourself, for example
one from a certificate authority your company requires.


Example (TypeScript):

```typescript
import { defineConfig, HttpApiGateway } from 'stacktape';

export default defineConfig(() => {
  const myApi = new HttpApiGateway({
    customDomains: [
      {
        domainName: 'api.example.com',
        customCertificateArn: 'arn:aws:acm:eu-west-1:123456789012:certificate/abc-def-123'
      }
    ]
  });

  return {
    resources: { myApi }
  };
});
```


The certificate must be in ACM in your AWS account and cover `domainName`. CDNs, AppSync and user pool domains need it
in `us-east-1`. API gateways and load balancers need it in the stack's region.

ACM renews DNS-validated certificates on its own while they're in use, as long as the validation records stay in DNS.
Imported certificates you renew yourself. See
[ACM renewal](https://docs.aws.amazon.com/acm/latest/userguide/dns-renewal-validation.html).

## External DNS

Keep DNS at your current provider, such as Cloudflare, when you want to keep managing records there or keep its proxy
and firewall. With `customCertificateArn` and `disableDnsRecordCreation: true`, Stacktape doesn't look for a Route 53
zone for that hostname.

1. Request a public certificate in ACM, in the region the resource needs. Include every hostname you'll serve: a
   certificate for `example.com` alone doesn't cover `app.example.com`.
2. Add the validation CNAME records that ACM shows at your DNS provider, and wait for **Issued**.
3. Set `customCertificateArn` and `disableDnsRecordCreation: true`, then deploy.
4. At your DNS provider, add a CNAME from your hostname to the AWS hostname:
   - **Load balancer**: **DNS name** in EC2 → Load Balancers.
   - **API Gateway**: **API Gateway domain name** in API Gateway → Custom domain names.
   - **CDN**: the CloudFront distribution's domain name.

A plain CNAME doesn't work on the bare `example.com`. Use your provider's ALIAS record or CNAME flattening there.


Example (TypeScript):

```typescript
import { defineConfig, ApplicationLoadBalancer } from 'stacktape';

export default defineConfig(() => {
  const myAlb = new ApplicationLoadBalancer({
    customDomains: [
      {
        domainName: 'app.example.com',
        customCertificateArn: 'arn:aws:acm:eu-west-1:123456789012:certificate/abc-def-123',
        disableDnsRecordCreation: true
      }
    ]
  });

  return {
    resources: { myAlb }
  };
});
```


For a user pool domain, the parent domain needs an
[A record](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-add-custom-domain.html) before
the deploy; point the CNAME at the alias target Cognito shows. For AppSync, use the target AppSync shows.

If you bought the domain through Cloudflare Registrar, its DNS must stay at Cloudflare, so use this external DNS path.

## Multiple domains

A resource can serve several hostnames. Each entry has its own certificate and DNS settings:


Example (TypeScript):

```typescript
import { defineConfig, HttpApiGateway } from 'stacktape';

export default defineConfig(() => {
  const myApi = new HttpApiGateway({
    customDomains: [
      { domainName: 'api.example.com' },
      { domainName: 'api.mycompany.io' },
      {
        domainName: 'api-legacy.example.com',
        customCertificateArn: 'arn:aws:acm:eu-west-1:123456789012:certificate/abc-def-456',
        disableDnsRecordCreation: true
      }
    ]
  });

  return {
    resources: { myApi }
  };
});
```


Stacktape uses one hosted zone per root domain. Here `api.example.com` uses the `example.com` zone, and
`api.mycompany.io` needs a `mycompany.io` zone with its own `stacktape domain add` setup. `api-legacy.example.com` uses
external DNS, so Stacktape creates no record for it.

To send different paths of one hostname to different backends, attach the domain to one
[Application Load Balancer](/resources/networking/application-load-balancer) or
[HTTP API Gateway](/resources/networking/http-api-gateway) and route by path there.

## Cost

A Route 53 hosted zone costs $0.50 a month, plus $0.40 per million DNS queries. Queries for alias records that point
at AWS resources are free. ACM public certificates are free. See
[Route 53 pricing](https://aws.amazon.com/route53/pricing/).

## Configuration reference


### Definition: `DomainConfiguration`

The complete property-level reference is included in `llms-api-reference.txt` and indexed under route `/config-reference/helpers` with definition name `DomainConfiguration`.

| Property | Required | Type | Default |
| --- | --- | --- | --- |
| `domainName` | yes | `string` | - |
| `customCertificateArn` | no | `string` | - |
| `disableDnsRecordCreation` | no | `boolean` | `false` |
