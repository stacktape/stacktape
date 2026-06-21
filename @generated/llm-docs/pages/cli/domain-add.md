# domain:add

The `domain:add` command adds an already-registered root domain to your AWS account so Stacktape can manage DNS and TLS certificates for it. Once added, the domain and its subdomains can be used with [web services](/resources/compute/web-service), [hosting buckets](/resources/frontend/static-hosting), and [HTTP API Gateways](/resources/networking/http-api-gateway). The command requires `--region` and, on success, finishes with `Domain ready to use in <region>.`

## Usage

```bash
stacktape domain:add --region eu-west-1
```

The command runs an interactive wizard. You supply only the `--region` flag — the domain name is entered interactively during the wizard.

## What it does

The `domain:add` wizard walks through the following steps, stopping at the first incomplete one.

1. **Enter domain name** — Must be a root domain (e.g. `mydomain.com`, not `sub.mydomain.com`). If you enter a subdomain, the command exits with an error.
2. **Check registration** — If the domain is not registered (not purchased), the command exits immediately and prints a hint to register via Route 53 or another registrar. Prices start at $3/year for `.click` domains.
3. **Verify DNS ownership** — If DNS is managed outside AWS, the command asks whether to move DNS management to Route 53. If confirmed and no hosted zone exists, it creates one and prints the name servers to configure at your registrar.
4. **Provision TLS certificates** — Requests a regional ACM certificate. When the selected region is not `us-east-1`, the command also requests a `us-east-1` ACM certificate, which Stacktape stores as `usEast1Cert` in domain status. When the regional certificate is not yet issued, it adds a DNS validation record from the regional certificate's domain validation options to the Route 53 hosted zone.
5. **Optional SES verification** — If certificates are in place, optionally adds DKIM records so the domain can send email through AWS SES.

The command stores domain status in Parameter Store after key checkpoints (hosted-zone setup, certificate-validation-record setup), so later runs can read saved domain status. Re-run `domain:add` after DNS or certificate validation has had time to complete.


> **Warning:** Only root domains are accepted. If you enter a subdomain like `api.mydomain.com`, the command exits with an error. Add the root domain (`mydomain.com`) first, then configure subdomains on the resource that should serve them. See [custom domains](/resources/networking/custom-domains) for the resource-level setup.


## DNS ownership scenarios

The command handles two scenarios based on the domain's DNS ownership status.

### DNS already verified

If Stacktape detects that domain ownership is already verified, the command skips straight to TLS certificate provisioning.

### DNS managed outside AWS

When DNS for the domain is managed outside AWS, the command asks whether you want to move DNS management to Route 53. If you confirm:

1. A Route 53 hosted zone is created (if one doesn't already exist).
2. The command prints the name server records to set at your registrar.
3. DNS propagation can take hours to days depending on the registrar and prior TTL values.
4. After propagation, re-run `domain:add` to continue with certificate provisioning.


> **Info:** If the domain is already in use, copy your existing DNS records into the new Route 53 hosted zone before updating the name servers at your registrar. This prevents downtime during the migration.


## TLS certificates

The command requests a free AWS ACM certificate in the specified `--region`. When the selected region is not `us-east-1`, the command also requests a `us-east-1` ACM certificate, which Stacktape stores as `usEast1Cert` in domain status. When the regional certificate is not yet issued, the command adds a DNS validation record from the regional certificate's domain validation options to the Route 53 hosted zone. Certificate issuance typically takes a few minutes after DNS records are in place.


> **Tip:** The command prints https://console.stacktape.com/domains as the place to continue or check domain setup.


## SES email verification

If domain ownership and TLS certificates are complete, the command optionally offers to verify the domain for sending email through AWS SES. This adds DKIM authentication records to the hosted zone. Skip this step if you don't plan to send transactional email from your application.

## Arguments reference

<CliCommandsApiReference command="domain:add" sortedArgs={[
  {
    "name": "region",
    "required": true,
    "alias": "r",
    "allowedTypes": [
      "string"
    ],
    "allowedValues": [
      "us-east-2",
      "us-east-1",
      "us-west-1",
      "us-west-2",
      "ap-east-1",
      "ap-south-1",
      "ap-northeast-3",
      "ap-northeast-2",
      "ap-southeast-1",
      "ap-southeast-2",
      "ap-northeast-1",
      "ca-central-1",
      "eu-central-1",
      "eu-west-1",
      "eu-west-2",
      "eu-west-3",
      "eu-north-1",
      "me-south-1",
      "sa-east-1",
      "af-south-1",
      "eu-south-1"
    ],
    "shortDescription": "<p> AWS Region</p>\n",
    "longDescription": "<p>The AWS region for the operation. For a list of available regions, see the <a href=\"https://docs.aws.amazon.com/general/latest/gr/rande.html\" style=\"font-weight: bold;\" target=\"_blank\" rel=\"noreferrer\" onclick=\"event.stopPropagation();\">AWS documentation</a>.</p>\n"
  },
  {
    "name": "agent",
    "required": false,
    "alias": "ag",
    "allowedTypes": [
      "boolean"
    ],
    "shortDescription": "<p> Agent Mode</p>\n",
    "longDescription": "<p>Optimizes CLI output for programmatic/LLM consumption:</p>\n<ul>\n<li>Uses strict JSONL/NDJSON output (one JSON object per line)</li>\n<li>Disables interactive terminal UI</li>\n<li>Automatically confirms operations (equivalent to --autoConfirmOperation)\nFor dev command: also enables HTTP server for programmatic control.</li>\n</ul>\n"
  },
  {
    "name": "awsAccount",
    "required": false,
    "alias": "aa",
    "allowedTypes": [
      "string"
    ],
    "shortDescription": "<p> AWS Account</p>\n",
    "longDescription": "<p>The name of the AWS account to use for the operation. The account must first be connected in the <a href=\"https://console.stacktape.com/aws-accounts\" style=\"font-weight: bold;\" target=\"_blank\" rel=\"noreferrer\" onclick=\"event.stopPropagation();\">Stacktape console</a>.</p>\n"
  },
  {
    "name": "help",
    "required": false,
    "alias": "h",
    "allowedTypes": [
      "string"
    ],
    "shortDescription": "<p> Show Help</p>\n",
    "longDescription": "<p>If provided, the command will not execute and will instead print help information.</p>\n"
  },
  {
    "name": "logLevel",
    "required": false,
    "alias": "ll",
    "allowedTypes": [
      "string"
    ],
    "allowedValues": [
      "info",
      "debug",
      "error"
    ],
    "shortDescription": "<p> Log Level</p>\n",
    "longDescription": "<p>The level of logs to print to the console.</p>\n<ul>\n<li><code>info</code>: Basic information about the operation.</li>\n<li><code>error</code>: Only errors.</li>\n<li><code>debug</code>: Detailed information for debugging.</li>\n</ul>\n"
  },
  {
    "name": "outputFormat",
    "required": false,
    "alias": "ofmt",
    "allowedTypes": [
      "string"
    ],
    "allowedValues": [
      "jsonl",
      "plain",
      "tty"
    ],
    "shortDescription": "<p> Output Format</p>\n",
    "longDescription": "<p>Controls the CLI output format:</p>\n<ul>\n<li><code>jsonl</code>: Machine-readable NDJSON (one JSON object per line). Disables interactive UI.</li>\n<li><code>plain</code>: Simple text output without colors or animations. Used automatically in CI or non-TTY environments.</li>\n<li><code>tty</code>: Full interactive terminal UI with colors, spinners, and animations. Used automatically when a TTY is detected.\nIf not specified, the format is auto-detected from the environment. --agent implies --outputFormat jsonl.</li>\n</ul>\n"
  },
  {
    "name": "profile",
    "required": false,
    "alias": "p",
    "allowedTypes": [
      "string"
    ],
    "shortDescription": "<p> AWS Profile</p>\n",
    "longDescription": "<p>The AWS profile to use for the command. You can manage profiles using the <code>aws-profile:*</code> commands and set a default profile with <code>defaults:configure</code>.</p>\n"
  }
]} />

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

No. The `domain:add` command only accepts root domains (e.g. `mydomain.com`). Entering a subdomain like `api.mydomain.com` causes the command to exit with an error. Add the root domain first, then configure subdomains on the resource that should serve them. See [custom domains](/resources/networking/custom-domains) for the resource-level setup.

### What happens if my domain is not yet registered?

If the domain is not registered (not purchased from any registrar), the command exits immediately and prints a hint to register it. You can register via [Route 53](https://us-east-1.console.aws.amazon.com/route53/home#DomainRegistration) (prices start at $3/year for `.click` domains) or any other domain registrar. After registration, re-run `domain:add`.

### Do I need to run this command in every region?

The command creates a regional certificate for the selected `--region` and, when that region is not `us-east-1`, also requests a `us-east-1` ACM certificate stored as `usEast1Cert` in domain status. Run the command in each region where you intend regional certificates for the domain.

### How long does DNS propagation take?

DNS propagation after updating name servers at your registrar typically takes anywhere from a few hours to 48 hours, depending on the registrar and prior TTL values. AWS ACM certificate validation usually completes within minutes once DNS has propagated. Re-run `domain:add` after propagation to continue the setup.

### Is there a cost for adding a domain?

The command describes TLS certificates as free, and SES verification as free. Route 53 domain registration prices start at $3/year for `.click` domains (as noted by the command when a domain is unregistered).

### What happens if I cancel midway through the wizard?

The command stores domain status in AWS Parameter Store after selected steps such as hosted-zone setup and certificate-validation setup. Re-run `domain:add` after the pending step (DNS propagation, certificate validation) has had time to complete — the wizard may still re-confirm prompts before proceeding.

### Can I use a domain registered outside AWS?

Yes. For domains registered with GoDaddy, Namecheap, Hostinger, or another registrar, the command asks whether to move DNS management to Route 53. If you confirm, it creates a hosted zone (if needed) and prints the name servers to set at your registrar. After DNS propagation, re-run the command to continue with certificate provisioning.

### What resources can use a custom domain after adding it?

The CLI describes the added domain as usable with web services, hosting buckets, and API Gateways. After adding the root domain, configure subdomains on the resource that should serve them. For the full setup guide, see [custom domains](/resources/networking/custom-domains).

### How does DNS validation work for TLS certificates?

AWS ACM validates domain ownership by checking for a specific DNS record in the domain's hosted zone. When the regional certificate is not yet issued, the `domain:add` command adds a DNS validation record from the regional certificate's domain validation options to the Route 53 hosted zone. Certificate issuance typically completes within minutes once the record is in place.

### Can I use domain:add in a CI/CD pipeline?

The `domain:add` command prompts for the domain name interactively and asks for multiple confirmations during setup, making it primarily an interactive command. Domain setup is typically a one-time task per region — run it manually rather than scripting it into CI.
