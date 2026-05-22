# domain:add

The `domain:add` command adds an already-registered root domain to your AWS account so Stacktape can manage DNS and TLS certificates for it. Once added, the domain and its subdomains can be used with [web services](/resources/compute/web-service), [hosting buckets](/resources/frontend/static-hosting), and [HTTP API Gateways](/resources/networking/http-api-gateway). Run this command once per region before referencing the domain in your Stacktape configuration.

## Usage

```bash
stacktape domain:add --region eu-west-1
```

The command runs an interactive wizard. You supply only the `--region` flag — the domain name is entered interactively during the wizard.

## What it does

The `domain:add` wizard walks through up to four stages. It stops at the first incomplete step and resumes from saved progress on subsequent runs.

1. **Enter domain name** — Must be a root domain (e.g. `mydomain.com`, not `sub.mydomain.com`). If you enter a subdomain, the command exits with an error.
2. **Check registration** — If the domain is not registered (not purchased), the command exits immediately and prints a hint to register via Route 53 or another registrar. Prices start at $3/year for `.click` domains.
3. **Verify DNS ownership** — If DNS is managed outside AWS, the command asks whether to move DNS management to Route 53. If confirmed and no hosted zone exists, it creates one and prints the name servers to configure at your registrar.
4. **Provision TLS certificates** — Requests a regional ACM certificate. When the selected region is not `us-east-1`, it also requests a `us-east-1` certificate for CloudFront/CDN use. Adds DNS validation records to the hosted zone.
5. **Optional SES verification** — If certificates are in place, optionally adds DKIM records so the domain can send email through AWS SES.

The command stores domain status in AWS Parameter Store at key checkpoints, so later runs can continue from saved domain status without repeating completed steps.


> **Warning:** Only root domains are accepted. If you enter a subdomain like `api.mydomain.com`, the command exits with an error. Add the root domain (`mydomain.com`) first — subdomains are configured in each resource's `customDomains` property.


## DNS ownership scenarios

The command handles two scenarios depending on where the domain is registered.

### Domain registered in Route 53

If the domain was purchased through AWS Route 53, ownership is already verified and the command skips straight to TLS certificate provisioning.

### Domain registered elsewhere

For domains registered with GoDaddy, Namecheap, Hostinger, or other external registrars, the command asks whether you want to move DNS management to Route 53. If you confirm:

1. A Route 53 hosted zone is created (if one doesn't already exist).
2. The command prints the name server records to set at your registrar.
3. DNS propagation can take hours to days depending on the registrar and prior TTL values.
4. After propagation, re-run `domain:add` to continue with certificate provisioning.


> **Info:** If the domain is already in use, copy your existing DNS records into the new Route 53 hosted zone before updating the name servers at your registrar. This prevents downtime during the migration.


## TLS certificates

The command requests a free AWS ACM certificate in the specified `--region`. When the selected region is not `us-east-1`, it also requests a `us-east-1` certificate for CloudFront/CDN use. Certificates are validated via DNS — the command automatically adds the required DNS validation record(s) to the Route 53 hosted zone. Certificate issuance typically takes a few minutes after DNS records are in place.


> **Tip:** After running the command, check certificate and domain status in the Stacktape Console at https://console.stacktape.com/domains.


## SES email verification

If domain ownership and TLS certificates are complete, the command optionally offers to verify the domain for sending email through AWS SES. This adds DKIM authentication records to the hosted zone. Skip this step if you don't plan to send transactional email from your application.

## Arguments reference


## CLI Options: `stacktape domain:add`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `--region (-r)` | yes | `string` | AWS Region The AWS region for the operation. For a list of available regions, see the [AWS documentation](https://docs.aws.amazon.com/general/latest/gr/rande.html). | `us-east-2`, `us-east-1`, `us-west-1`, `us-west-2`, `ap-east-1`, `ap-south-1`, `ap-northeast-3`, `ap-northeast-2`, `ap-southeast-1`, `ap-southeast-2`, `ap-northeast-1`, `ca-central-1`, `eu-central-1`, `eu-west-1`, `eu-west-2`, `eu-west-3`, `eu-north-1`, `me-south-1`, `sa-east-1`, `af-south-1`, `eu-south-1` |
| `--agent (-ag)` | no | `boolean` | Agent Mode Optimizes CLI output for programmatic/LLM consumption:

Uses strict JSONL/NDJSON output (one JSON object per line)
Disables interactive terminal UI
Automatically confirms operations (equivalent to --autoConfirmOperation)
For dev command: also enables HTTP server for programmatic control. | - |
| `--awsAccount (-aa)` | no | `string` | AWS Account The name of the AWS account to use for the operation. The account must first be connected in the [Stacktape console](https://console.stacktape.com/aws-accounts). | - |
| `--help (-h)` | no | `string` | Show Help If provided, the command will not execute and will instead print help information. | - |
| `--logLevel (-ll)` | no | `string` | Log Level The level of logs to print to the console.

`info`: Basic information about the operation.
`error`: Only errors.
`debug`: Detailed information for debugging. | `info`, `debug`, `error` |
| `--outputFormat (-ofmt)` | no | `string` | Output Format Controls the CLI output format:

`jsonl`: Machine-readable NDJSON (one JSON object per line). Disables interactive UI.
`plain`: Simple text output without colors or animations. Used automatically in CI or non-TTY environments.
`tty`: Full interactive terminal UI with colors, spinners, and animations. Used automatically when a TTY is detected.
If not specified, the format is auto-detected from the environment. --agent implies --outputFormat jsonl. | `jsonl`, `plain`, `tty` |
| `--profile (-p)` | no | `string` | AWS Profile The AWS profile to use for the command. You can manage profiles using the `aws-profile:*` commands and set a default profile with `defaults:configure`. | - |


## Examples

Add a domain in the eu-west-1 region:

```bash
stacktape domain:add --region eu-west-1
```

Add a domain using a specific AWS profile:

```bash
stacktape domain:add --region us-east-1 --profile production
```

Add a domain using a named AWS account connected in the Stacktape Console:

```bash
stacktape domain:add --region eu-west-1 --awsAccount my-prod-account
```

## Related commands

- [`deploy`](/cli/deploy) — deploy your stack, which can reference the added domain via [custom domain configuration](/resources/networking/custom-domains)
- [`defaults:configure`](/cli/defaults-configure) — set a default region so you don't need `--region` every time

## FAQ

### Can I add a subdomain instead of a root domain?

No. The `domain:add` command only accepts root domains (e.g. `mydomain.com`). Entering a subdomain like `api.mydomain.com` causes the command to exit with an error. Add the root domain first, then configure subdomain routing in each resource's [custom domain settings](/resources/networking/custom-domains).

### What happens if my domain is not yet registered?

If the domain is not registered (not purchased from any registrar), the command exits immediately and prints a hint to register it. You can register via [Route 53](https://us-east-1.console.aws.amazon.com/route53/home#DomainRegistration) (prices start at $3/year for `.click` domains) or any other domain registrar. After registration, re-run `domain:add`.

### Do I need to run this command in every region?

Run `domain:add` in each region where you plan to deploy stacks that use the domain. The command provisions a regional TLS certificate, and when the region is not `us-east-1`, also a `us-east-1` certificate for CloudFront/CDN use. If you only deploy in one region, one run is sufficient.

### How long does DNS propagation take?

DNS propagation after updating name servers at your registrar typically takes anywhere from a few hours to 48 hours, depending on the registrar and prior TTL values. AWS ACM certificate validation usually completes within minutes once DNS has propagated. Re-run `domain:add` after propagation to continue the setup.

### Is there a cost for adding a domain?

The TLS certificates provisioned by the command are free (AWS ACM does not charge for public certificates). Route 53 domain registration prices start at $3/year for `.click` domains. AWS charges separately for Route 53 hosted zone usage. The `domain:add` command itself does not charge anything.

### What happens if I cancel midway through the wizard?

The command stores domain status in AWS Parameter Store at key checkpoints. Running `domain:add` again resumes from the last saved state — you won't repeat hosted zone creation or certificate requests that already completed.

### Can I use a domain registered outside AWS?

Yes. For domains registered with GoDaddy, Namecheap, Hostinger, or another registrar, the command asks whether to move DNS management to Route 53. If you confirm, it creates a hosted zone (if needed) and prints the name servers to set at your registrar. After DNS propagation, re-run the command to continue with certificate provisioning.

### What resources can use a custom domain after adding it?

The CLI describes the added domain as usable with web services, hosting buckets, and API Gateways. Configure the domain in each resource's `customDomains` property. For the full custom domain setup guide, see [custom domains](/resources/networking/custom-domains).

### How does DNS validation work for TLS certificates?

AWS ACM validates domain ownership by checking for a specific DNS record in the domain's hosted zone. The `domain:add` command automatically creates the required DNS validation record(s) in the Route 53 hosted zone. Certificate issuance typically completes within minutes once the records are in place.

### Can I use domain:add in a CI/CD pipeline?

The command is interactive by default — it prompts for the domain name and confirmations. For non-interactive environments, use the `--agent` flag, which outputs JSONL and auto-confirms operations. However, since domain setup is typically a one-time task per region, most teams run it manually rather than automating it.
