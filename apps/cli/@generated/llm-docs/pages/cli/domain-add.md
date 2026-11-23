# domain add

`stacktape domain add` prepares a domain you already own for Stacktape: it moves the domain's DNS to Route 53 when it isn't there yet and requests TLS certificates. Then [web services](/resources/compute/web-service), [hosting buckets](/resources/frontend/static-hosting), [HTTP API Gateways](/resources/networking/http-api-gateway) and [WebSocket API Gateways](/resources/networking/websocket-api-gateway) can use the domain. [Custom domains](/resources/networking/custom-domains#set-up-the-domain) covers the whole setup, including which names a certificate covers.

## Usage

```bash
stacktape domain add --region eu-west-1
```

The command asks for the domain name. It stops at the first step that isn't finished yet, for example while DNS changes propagate. Run it again later and it continues where it stopped; it keeps its progress in Parameter Store. When everything is done, it prints `Domain ready to use in <region>.`

## What it does

1. **Domain name.** Enter a root domain (`mydomain.com`) or a subdomain (`api.dev.mydomain.com`). DNS is always set up for the root domain; the certificates are requested for the name you enter.
2. **Registration.** If nobody has registered the domain yet, the command stops and prints how to register it with Route 53 (from $3 a year for `.click`) or another registrar.
3. **DNS.** If the domain's DNS is outside AWS, for example at GoDaddy or Namecheap, the command asks to move it to Route 53. It creates a hosted zone and prints the name servers to set at your registrar. If the domain already serves traffic, copy its DNS records into the new hosted zone before you change the name servers, or the domain stops resolving. Propagation can take hours.
4. **Certificates.** It requests a free ACM certificate in `--region` and, when that region isn't `us-east-1`, a second one in `us-east-1`, which CDNs need. It adds the DNS validation records to the hosted zone; AWS usually issues the certificates a few minutes later.

Certificates are regional, so run the command in each region where you deploy resources that use the domain. ACM certificates are free; a Route 53 hosted zone costs $0.50 a month.

## Examples

Use a specific AWS profile:

```bash
stacktape domain add --region us-east-1 --profile production
```

Use an AWS account connected in the Stacktape Console:

```bash
stacktape domain add --region eu-west-1 --aws-account my-prod-account
```

## Options


## CLI Options: `stacktape domain add`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `-r, --region` | yes | `string` | AWS Region — The AWS region for the operation. For a list of available regions, see the [AWS documentation](https://docs.aws.amazon.com/general/latest/gr/rande.html). Inside a project whose config declares `region`, the flag is optional and overrides the config. | `us-east-2`, `us-east-1`, `us-west-1`, `us-west-2`, `ap-east-1`, `ap-south-1`, `ap-northeast-3`, `ap-northeast-2`, `ap-southeast-1`, `ap-southeast-2`, `ap-northeast-1`, `ca-central-1`, `eu-central-1`, `eu-west-1`, `eu-west-2`, `eu-west-3`, `eu-north-1`, `me-south-1`, `sa-east-1`, `af-south-1`, `eu-south-1` |
| `--aws-account` | no | `string` | AWS Account — The name of the AWS account to use for the operation. The account must first be connected in the [Stacktape Console](https://console.stacktape.com/aws-accounts). Without it, the account is chosen by `--profile`, `AWS_PROFILE` or AWS credentials in environment variables, then by your saved default, then by your organization's only connected account. `--aws-account` takes precedence over all of them, but AWS credentials in environment variables must then belong to that account. | - |
| `-h, --help` | no | `string` | Show Help — If provided, the command will not execute and will instead print help information. | - |
| `--log-level` | no | `string` | Log Level — The level of logs to print to the console. • `info`: Basic information about the operation. • `error`: Only errors. • `debug`: Detailed information for debugging. | `info`, `debug`, `error` |
| `-p, --profile` | no | `string` | AWS Profile — The AWS profile to use for the command. You can manage profiles using the `aws-profile:*` commands and set a default profile with `defaults set`. For commands that use a connected AWS account, `--profile` (or `AWS_PROFILE`) selects the connected account the profile belongs to, unless `--aws-account` is set. The command fails if that account is not connected. | - |
| `--quiet` | no | `boolean` | Quiet — Hide progress, banners, success messages and hints. Command output, warnings and errors are still printed. | - |


## Related commands

- [`deploy`](/cli/deploy) — deploy your stack, which can reference the added domain via [custom domain configuration](/resources/networking/custom-domains)
- [`defaults set`](/cli/defaults-configure) — set a default region so you don't need `--region` every time
