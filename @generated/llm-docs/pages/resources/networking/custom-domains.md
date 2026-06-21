# Custom Domains

Stacktape custom domains attach your own domain names (like `api.example.com`) to resources instead of auto-generated AWS endpoints. Stacktape can create a DNS record and provision a free ACM certificate after the domain has a Route53 hosted zone in your AWS account and your registrar's nameservers point to that zone.

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

Custom domains attach directly to four networking resources Stacktape exposes:

| Resource | Typical use case |
|----------|-----------------|
| [HTTP API Gateway](/resources/networking/http-api-gateway) | `api.example.com` for Lambda-backed APIs |
| [Application Load Balancer](/resources/networking/application-load-balancer) | `app.example.com` for container workloads |
| [Network Load Balancer](/resources/networking/network-load-balancer) | TCP/TLS services at a custom domain |
| [CDN](/resources/networking/cdn) | `cdn.example.com` for cached content delivery |

A [CDN](/resources/networking/cdn) can target a [bucket](/resources/storage/s3-bucket), [Application Load Balancer](/resources/networking/application-load-balancer), [HTTP API Gateway](/resources/networking/http-api-gateway), or [Lambda function](/resources/compute/lambda-function), which is how you can put a custom domain in front of those origins. For [web services](/resources/compute/web-service), [hosting buckets](/resources/frontend/static-hosting), and SSR frontends, see each resource's page for how custom domains are configured through the underlying networking layer.

Each entry in a resource's `customDomains` array is a `DomainConfiguration` object with three fields: `domainName` (required), `customCertificateArn` (optional), and `disableDnsRecordCreation` (optional, defaults to `false`). The structure is identical across every resource type that accepts custom domains.

## Prerequisites

The custom domain must resolve through a Route53 hosted zone in your AWS account, with your registrar's nameservers pointing to it. Use the [`stacktape domain:add`](/cli/domain-add) command to create the hosted zone and retrieve the nameservers to configure at your registrar.

In typical DNS setups, one hosted zone for `example.com` can contain records for subdomains such as `api.example.com`, `app.example.com`, and `staging.example.com`. Route53 hosted zones have a small monthly cost per zone, and ACM certificates provisioned by Stacktape are free.

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


With just `domainName` specified, Stacktape automatically creates a DNS record in Route53 and provisions a free TLS certificate via AWS Certificate Manager. The certificate is renewed automatically before expiration — no manual intervention needed.

The `domainName` value should not include a protocol prefix (`https://`). Use the bare domain: `api.example.com`, not `https://api.example.com`.

## TLS certificates

Stacktape provisions and manages free TLS certificates by default. For most teams, this is all you need — certificates are issued via AWS Certificate Manager, validated through DNS, and renewed automatically.

If you have specific certificate requirements — such as Extended Validation (EV) or Organization Validation (OV) certificates for compliance — provide the ARN of an existing ACM certificate from your AWS account using `customCertificateArn`. When set, Stacktape uses that ACM certificate instead of provisioning a new one.


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


The `customCertificateArn` must reference a certificate already imported or issued in your AWS account's ACM. When you provide a custom certificate, Stacktape skips automatic certificate provisioning for that domain.


> **Warning:** When you provide an imported or externally issued certificate via `customCertificateArn`, plan its renewal yourself. Stacktape only handles automatic renewal for certificates it provisions by default.


> **Tip:** For CDN custom domains, CloudFront has its own ACM certificate-region requirement — check [AWS CloudFront certificate rules](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cnames-and-https-requirements.html) before supplying `customCertificateArn`.


**When to use a custom certificate:** Only when compliance or organizational policy requires EV/OV certificates, or when you need to use a certificate from an external CA imported into ACM. For all other cases, the auto-provisioned free certificate is the right choice — it costs nothing and renews itself.

## External DNS

If you manage DNS through an external provider like Cloudflare or Google Cloud DNS, set `disableDnsRecordCreation` to `true`. When this flag is set, Stacktape does not create or modify DNS records, so you manage the DNS record yourself. Stacktape still provisions the TLS certificate, but does not create or modify the DNS record for the domain.


Example (TypeScript):

```typescript
import { defineConfig, ApplicationLoadBalancer } from 'stacktape';
export default defineConfig(() => {
  const myAlb = new ApplicationLoadBalancer({
    customDomains: [
      {
        domainName: 'app.example.com',
        disableDnsRecordCreation: true
      }
    ]
  });

  return {
    resources: { myAlb }
  };
});
```


The `domainName` configuration requires that the domain has a Route53 hosted zone in your AWS account. Typically, a Route53 hosted zone is still needed even with `disableDnsRecordCreation: true`, because Stacktape uses it for DNS-based certificate validation. When `customCertificateArn` is also provided, Stacktape uses your pre-existing certificate instead of provisioning a new one, reducing the dependency on Route53 for certificate validation.

**When to use external DNS:** When your domain's authoritative DNS is managed outside Route53 (Cloudflare, Google Cloud DNS, etc.) and you don't want Stacktape creating DNS records in Route53. This is common when Cloudflare handles CDN/WAF at the DNS layer, or when DNS is managed by a separate team. After deployment, create the required DNS record in your external DNS provider pointing to the endpoint Stacktape exposes for the resource.

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
      { domainName: 'api-legacy.example.com', disableDnsRecordCreation: true }
    ]
  });

  return {
    resources: { myApi }
  };
});
```


Each array entry can include its own `domainName`, `customCertificateArn`, and `disableDnsRecordCreation` values. You can mix auto-managed DNS with external DNS, and auto-provisioned certificates with custom certificates, within the same resource.

Each root domain (e.g., `example.com` and `mycompany.io`) needs its own Route53 hosted zone.

## API Reference


## API Reference: `DomainConfiguration`
```typescript
type DomainConfiguration = {
  /** Your domain name (e.g., mydomain.com or api.mydomain.com). */
  domainName: string;
  /** Use your own TLS certificate instead of the auto-generated one. */
  customCertificateArn?: string;
  /** Skip DNS record creation for this domain. */
  disableDnsRecordCreation?: boolean;
};
```

| Property | Required | Type | Description | Default |
| --- | --- | --- | --- | --- |
| `domainName` | yes | `string` | Your domain name (e.g., `mydomain.com` or `api.mydomain.com`). Don&#39;t include the protocol (`https://`). The domain must have a Route53 hosted zone
in your AWS account, with your registrar&#39;s nameservers pointing to it.

Stacktape automatically creates a DNS record and provisions a free TLS certificate. | - |
| `customCertificateArn` | no | `string` | Use your own TLS certificate instead of the auto-generated one. Provide the ARN of an ACM certificate from your AWS account.
Only needed if you have specific certificate requirements (e.g., EV/OV certs).
By default, Stacktape provisions and renews free certificates automatically. | - |
| `disableDnsRecordCreation` | no | `boolean` | Skip DNS record creation for this domain. Set to `true` if you manage DNS records yourself (e.g., through Cloudflare or another DNS provider).
Stacktape will still provision the TLS certificate but won&#39;t touch your DNS. | `false` |


## FAQ

### Which Stacktape resources support custom domains?

Custom domains attach to [HTTP API Gateways](/resources/networking/http-api-gateway), [Application Load Balancers](/resources/networking/application-load-balancer), [Network Load Balancers](/resources/networking/network-load-balancer), and [CDNs](/resources/networking/cdn). A [CDN](/resources/networking/cdn) can target a [bucket](/resources/storage/s3-bucket), [Application Load Balancer](/resources/networking/application-load-balancer), [HTTP API Gateway](/resources/networking/http-api-gateway), or [Lambda function](/resources/compute/lambda-function), which is the typical way to put a custom domain in front of those origins. All four attachable resources use the same `DomainConfiguration` structure.

### How do I set up a Route53 hosted zone for my domain?

Use [`stacktape domain:add`](/cli/domain-add) to create a Route53 hosted zone for your domain. You then update your domain registrar's nameservers to point to the Route53 hosted zone. In typical DNS setups, one hosted zone for `example.com` can contain records for subdomains such as `api.example.com` and `app.example.com`.

### Can I use a domain registered outside AWS?

Yes. You don't need to transfer your domain registration to AWS. Register and keep the domain at any registrar (GoDaddy, Namecheap, Google Domains, etc.), then use [`stacktape domain:add`](/cli/domain-add) to create the Route53 hosted zone and update your registrar's nameservers to point to it. Your registrar handles registration; Route53 handles DNS resolution.

### Does Stacktape handle TLS certificate renewal?

By default, Stacktape provisions and renews free certificates automatically via AWS Certificate Manager. If you provide a custom certificate via `customCertificateArn`, you handle renewal yourself. For most teams, the auto-provisioned certificate is the right choice — it's free and fully managed.

### How much do custom domains cost on AWS?

Route53 hosted zones have a small monthly cost per zone, plus a per-query fee for DNS resolution. ACM certificates provisioned by Stacktape are free. One hosted zone covers unlimited subdomains, so `api.example.com`, `app.example.com`, and `staging.example.com` all share the same zone for `example.com`. See [AWS Route53 pricing](https://aws.amazon.com/route53/pricing/) for current rates.

### How long does it take for a custom domain to start working?

TLS certificate provisioning via DNS validation typically completes within minutes after the Route53 hosted zone is properly configured. DNS propagation for new records usually takes minutes but can take up to 48 hours in edge cases. Subsequent deployments that don't change the domain are faster since the certificate already exists.

### Can I use Cloudflare with Stacktape custom domains?

Yes. Set `disableDnsRecordCreation: true` so Stacktape does not create DNS records for the resource. The `domainName` property still requires a Route53 hosted zone in your AWS account. If you also provide `customCertificateArn`, Stacktape uses your existing ACM certificate instead of provisioning one. After deployment, create the required DNS record in your external DNS provider pointing to the endpoint Stacktape exposes for the resource.

### What's the difference between Route53 and my domain registrar?

A domain registrar (GoDaddy, Namecheap, etc.) handles domain registration — proving you own the name. Route53 is a DNS hosting service that translates domain names to IP addresses. You can register a domain anywhere and use Route53 for DNS resolution by updating your registrar's nameservers. Stacktape requires Route53 for DNS hosting but works with any registrar.

### Should I use custom domains on staging and development stages?

For most teams, no. Auto-generated AWS URLs are sufficient for non-production stages and carry no extra cost. If you want branded staging URLs, use subdomain conventions like `api-staging.example.com` — this adds no extra hosted-zone cost since all subdomains share the same zone.

### Can I route one domain to multiple backends?

For path-based routing under one domain, attach the custom domain to an [Application Load Balancer](/resources/networking/application-load-balancer) or [HTTP API Gateway](/resources/networking/http-api-gateway) and use their routing integrations. Application Load Balancer integrations can match paths, methods, hosts, headers, query parameters, and source IPs. HTTP API integrations match by method and path. See [HTTP triggers](/configuration/triggers/http-triggers) for details.
