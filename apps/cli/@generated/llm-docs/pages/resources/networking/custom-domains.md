# Custom Domains

Use a custom domain such as `api.example.com` to serve a resource at your own address. With DNS in Route 53, Stacktape can create the record for you. You can also [keep DNS at your current provider](#external-dns).

## When to use

Custom domains are essential for any production-facing resource. Use them when you need:

- **Branded URLs** — serve your API at `api.yourcompany.com` instead of a random AWS-generated hostname
- **Stable endpoint names** — clients call your chosen DNS name instead of an AWS-generated hostname
- **Multi-stage routing** — use subdomains to separate stages: `api.example.com` for production, `api-staging.example.com` for staging
- **Shared root domain** — route `app.example.com` to your frontend and `api.example.com` to your API, both under one root domain

## When NOT to use

- **Development and testing stages** — auto-generated AWS URLs work fine for stages only your team uses. Adding custom domains to throwaway stages adds setup overhead without benefit.
- **Internal-only services** — [private services](/resources/compute/private-service) reachable only within your stack or VPC don't need public custom domains. Use service discovery instead.
- **Rapid prototyping** — if you haven't registered a domain yet, start without custom domains. Add them later without rebuilding your stack.

## Supported resources

Custom domains attach directly to five networking resources Stacktape exposes:

| Resource | Typical use case |
|----------|-----------------|
| [HTTP API Gateway](/resources/networking/http-api-gateway) | `api.example.com` for Lambda-backed APIs |
| [WebSocket API Gateway](/resources/networking/websocket-api-gateway) | `realtime.example.com` for Lambda-backed real-time APIs |
| [Application Load Balancer](/resources/networking/application-load-balancer) | `app.example.com` for container workloads |
| [Network Load Balancer](/resources/networking/network-load-balancer) | TCP/TLS services at a custom domain |
| [CDN](/resources/networking/cdn) | `cdn.example.com` for cached content delivery |

A [CDN](/resources/networking/cdn) can target a [bucket](/resources/storage/s3-bucket), [Application Load Balancer](/resources/networking/application-load-balancer), [HTTP API Gateway](/resources/networking/http-api-gateway), or [Lambda function](/resources/compute/lambda-function), which is how you can put a custom domain in front of those origins. For [web services](/resources/compute/web-service), [hosting buckets](/resources/frontend/static-hosting), and SSR frontends, see each resource's page for how custom domains are configured through the underlying networking layer.

Each entry in a resource's `customDomains` array is a `DomainConfiguration` object with three fields: `domainName` (required), `customCertificateArn` (optional), and `disableDnsRecordCreation` (optional, defaults to `false`). The structure is identical across every resource type that accepts custom domains.

An API Gateway custom domain cannot contain both WebSocket and HTTP/REST API mappings. Use different hostnames, such as `api.example.com` and `realtime.example.com`; Stacktape rejects duplicate attachment before deployment.

## Prerequisites

For Stacktape-managed DNS, point your registrar's nameservers at a public Route 53 hosted zone in your AWS account. The zone for `example.com` holds records for names such as `api.example.com` and `app.example.com`. If the domain is already in use, follow the [AWS migration steps](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/migrate-dns-domain-in-use.html) before changing nameservers.

Use [`stacktape domain add --region eu-west-1`](/cli/domain-add) to set up the zone and request its certificates. Replace `eu-west-1` with the region you deploy to. Enter the domain when prompted. Once the nameservers point at Route 53, run the command again to finish setup. If you started in the Console, run the command after the DNS change so the CLI can find the domain during deployment. Repeat the setup for each deployment region and wait for the certificates you need to show **Issued** in ACM.

The Console requests certificates for the domain and a wildcard one level below it. For example, `*.example.com` covers `app.example.com`. Check the names on the certificate you use. For `api.dev.example.com`, enter that full name in `stacktape domain add` to set up a matching certificate. The CLI still uses the `example.com` zone.

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


After setup, a deploy with just `domainName` uses the matching certificate and creates the DNS record in Route 53.

The `domainName` value should not include a protocol prefix (`https://`). Use the bare domain: `api.example.com`, not `https://api.example.com`.

## TLS certificates

Stacktape can request free public certificates from AWS Certificate Manager (ACM) during managed DNS setup. Use `customCertificateArn` if you keep DNS at another provider or need to use an existing certificate, for example one issued by a certificate authority your organization requires.


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


The certificate must be in ACM in your AWS account and cover the hostname in `domainName`. For CloudFront, AppSync custom domains and Cognito user-pool custom domains, use `us-east-1`. For a regional API Gateway or load balancer, use the resource's region.

## External DNS

Keep DNS at your current provider if you want to keep editing records there or keep using features such as Cloudflare's proxy and firewall. With both `customCertificateArn` and `disableDnsRecordCreation: true`, Stacktape skips its managed hosted-zone lookup for this hostname.

1. Request a public certificate in ACM in the region your resource needs. Include each hostname you'll use. A certificate for `example.com` alone cannot serve `app.example.com`.
2. Add the validation CNAME records ACM gives you at your DNS provider. Wait for ACM to show **Issued**.
3. Set `customCertificateArn` to the certificate ARN, set `disableDnsRecordCreation: true`, and deploy.
4. At your DNS provider, point a CNAME for `app.example.com` to the AWS target hostname. Use the AWS hostname even if the application URL already shows your custom name.
   - **Load balancer**. Find **DNS name** in EC2 → Load Balancers.
   - **Regional API Gateway**. Find **Regional domain name** in API Gateway → Custom domain names.
   - **CDN**. Use the CloudFront distribution's domain name.

For the bare `example.com`, use an alias or CNAME flattening if your DNS provider supports it for that target. A standard CNAME only works below the root.


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


For Cognito, [check the parent domain's A record](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-add-custom-domain.html) before deploying and use the alias target Cognito displays. For AppSync, use the domain target shown in AppSync.

## Multiple domains

You can attach multiple custom domains to a single resource by adding entries to the `customDomains` array. This is useful for serving the same backend under different brands or domain names.


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


Each array entry can include its own `domainName`, `customCertificateArn`, and `disableDnsRecordCreation` values. You can mix auto-managed DNS with external DNS, and auto-provisioned certificates with custom certificates, within the same resource.

Each domain whose DNS Stacktape manages needs its own Route 53 hosted zone.

## API Reference


### Definition: `DomainConfiguration`

The complete property-level reference is included in `llms-api-reference.txt` and indexed under route `/config-reference/helpers` with definition name `DomainConfiguration`.

| Property | Required | Type | Default |
| --- | --- | --- | --- |
| `domainName` | yes | `string` | - |
| `customCertificateArn` | no | `string` | - |
| `disableDnsRecordCreation` | no | `boolean` | `false` |


## FAQ

### Which Stacktape resources support custom domains?

Custom domains attach directly to [HTTP API Gateways](/resources/networking/http-api-gateway), [WebSocket API Gateways](/resources/networking/websocket-api-gateway), [Application Load Balancers](/resources/networking/application-load-balancer), [Network Load Balancers](/resources/networking/network-load-balancer), and [CDNs](/resources/networking/cdn), using the same `DomainConfiguration` structure. [AppSync APIs](/resources/networking/appsync-api) and [Cognito user pools](/resources/security/user-auth-pool) use one `customDomain` entry. To put a custom domain in front of a [bucket](/resources/storage/s3-bucket) or [Lambda function](/resources/compute/lambda-function), front it with a [CDN](/resources/networking/cdn) and attach the domain there.

### Can I use a domain registered outside AWS?

Yes. Most registrars let you change the nameservers while keeping the registration there. If your registrar requires you to use its DNS, you can follow the [external DNS setup](#external-dns) or transfer the registration to a registrar that lets you change nameservers.

### Does Stacktape handle TLS certificate renewal?

ACM can renew eligible DNS-validated certificates while they're in use, including certificates you requested yourself. Leave the validation CNAME records in place. Renew imported certificates yourself. See [ACM renewal rules](https://docs.aws.amazon.com/acm/latest/userguide/dns-renewal-validation.html).

### How much do custom domains cost on AWS?

Route53 hosted zones have a small monthly cost per zone, plus a per-query fee for DNS resolution. ACM certificates provisioned by Stacktape are free. Since one hosted zone covers all subdomains of a root domain, your zone count is driven by the number of distinct root domains, not the number of subdomains. See [AWS Route53 pricing](https://aws.amazon.com/route53/pricing/) for current rates.

### How long does it take for a custom domain to start working?

DNS answers can stay cached after you change records or nameservers. Keep your old DNS service running while you switch to Route 53. Check the nameservers and wait for ACM to show **Issued** before deploying.

### Can I use Cloudflare with Stacktape custom domains?

Yes. You can [keep DNS at Cloudflare](#external-dns) and add the records yourself. If you bought the domain through [Cloudflare Registrar](https://developers.cloudflare.com/registrar/faq/#can-i-use-my-own-third-party-nameservers), keep DNS there or transfer the registration before moving DNS to Route 53. If you use Cloudflare only for DNS, check whether your registrar lets you change nameservers.

### Can I route one domain to multiple backends?

For path-based routing under one domain, attach the custom domain to an [Application Load Balancer](/resources/networking/application-load-balancer) or [HTTP API Gateway](/resources/networking/http-api-gateway) and route requests to different backends using their routing integrations. See [HTTP triggers](/resources/triggers/http-triggers) for the available matching options.
