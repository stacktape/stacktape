# bucket:sync

The `bucket:sync` command synchronizes the contents of a local directory with an S3 bucket. It uploads new and changed files, and removes files from the bucket that no longer exist in the source directory. Use it to deploy static assets, update hosting bucket content, or push build output to S3 after a frontend build.

## Usage

There are two ways to specify which bucket to sync to.

**Using your Stacktape configuration** — provide `--stage` and `--resourceName`. Stacktape resolves the bucket from your deployed stack and uses the `directoryUpload.directoryPath` defined in your config:

```bash
stacktape bucket:sync --stage production --resourceName myHostingBucket --region eu-west-1
```

**Using a bucket ID directly** — provide `--bucketId` (the AWS bucket name or physical resource ID) and `--sourcePath`:

```bash
stacktape bucket:sync --bucketId my-app-assets-bucket --sourcePath ./dist --region eu-west-1
```


> **Warning:** Files in the destination bucket that are not present in the source directory are deleted. This is a one-way mirror sync, not an additive upload.


## Important flags

### `--invalidateCdnCache`

When set to `true`, Stacktape finds any CloudFront distributions connected to the synced bucket and creates an invalidation for all paths (`/*`). Use this after updating a static site or SPA so users see the new content immediately instead of waiting for the CDN cache TTL to expire.

```bash
stacktape bucket:sync --stage production --resourceName website --region eu-west-1 --invalidateCdnCache
```

CDN invalidation starts immediately but may take a few seconds to propagate to all edge locations.

### `--headersPreset`

Configures HTTP cache-control and content-type headers on uploaded files based on a framework-optimized preset. If you are syncing via config mode (`--stage` + `--resourceName`), this can also be set in your Stacktape configuration's `directoryUpload.headersPreset` property — the CLI flag overrides it.

Available presets:

| Preset | Behavior |
|--------|----------|
| `static-website` | Caches all content on CDN, never in browser |
| `single-page-app` | `index.html` is never cached; all other assets cached indefinitely |
| `gatsby-static-website` | Optimized for Gatsby output structure |
| `astro-static-website` | `_astro/**` assets marked immutable |
| `sveltekit-static-website` | `_app/**` assets marked immutable |
| `nuxt-static-website` | `_nuxt/**` assets marked immutable |

```bash
stacktape bucket:sync --bucketId my-spa-bucket --sourcePath ./build --region us-east-1 --headersPreset single-page-app
```

### `--sourcePath`

Path to the local directory to sync. Can be absolute or relative to the current working directory. Required when using `--bucketId` mode; ignored in config mode (the path comes from your Stacktape config's `directoryUpload.directoryPath`).

### `--resourceName`

The name of the bucket resource as defined in your Stacktape configuration. Used together with `--stage` to identify the target bucket from your deployed stack. The source directory and headers preset are read from the resource's `directoryUpload` config.

## Examples

Sync a React SPA build folder to a hosting bucket and invalidate CDN cache:

```bash
stacktape bucket:sync --stage prod --resourceName frontend --region eu-west-1 --invalidateCdnCache
```

Sync to an arbitrary S3 bucket with a preset for Astro:

```bash
stacktape bucket:sync --bucketId my-astro-site-bucket --sourcePath ./dist --region us-east-1 --headersPreset astro-static-website
```

Sync with a specific AWS profile:

```bash
stacktape bucket:sync --stage staging --resourceName assets --region eu-central-1 --profile my-aws-profile
```

## Argument reference


## CLI Options: `stacktape bucket:sync`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `--region (-r)` | yes | `string` | AWS Region The AWS region for the operation. For a list of available regions, see the [AWS documentation](https://docs.aws.amazon.com/general/latest/gr/rande.html). | `us-east-2`, `us-east-1`, `us-west-1`, `us-west-2`, `ap-east-1`, `ap-south-1`, `ap-northeast-3`, `ap-northeast-2`, `ap-southeast-1`, `ap-southeast-2`, `ap-northeast-1`, `ca-central-1`, `eu-central-1`, `eu-west-1`, `eu-west-2`, `eu-west-3`, `eu-north-1`, `me-south-1`, `sa-east-1`, `af-south-1`, `eu-south-1` |
| `--agent (-ag)` | no | `boolean` | Agent Mode Optimizes CLI output for programmatic/LLM consumption:

Uses strict JSONL/NDJSON output (one JSON object per line)
Disables interactive terminal UI
Automatically confirms operations (equivalent to --autoConfirmOperation)
For dev command: also enables HTTP server for programmatic control. | - |
| `--awsAccount (-aa)` | no | `string` | AWS Account The name of the AWS account to use for the operation. The account must first be connected in the [Stacktape console](https://console.stacktape.com/aws-accounts). | - |
| `--bucketId (-bi)` | no | `string` | Bucket ID The identifier of the destination bucket (either the AWS physical resource ID or the bucket name). | - |
| `--configPath (-cp)` | no | `string` | Config File Path The path to your Stacktape configuration file, relative to the current working directory. | - |
| `--currentWorkingDirectory (-cwd)` | no | `string` | Current Working Directory The working directory for the operation. All file paths in your configuration will be resolved relative to this directory. By default, this is the directory containing the configuration file. | - |
| `--headersPreset (-hp)` | no | `string` | Headers Preset Configures HTTP headers of uploaded files based on a selected preset.

`static-website`: Caches all content on the CDN but never in the browser.
`gatsby-static-website`: Optimized for static websites built with Gatsby.
`single-page-app`: Optimized for Single-Page Applications. `index.html` is never cached, while all other assets are cached indefinitely.
`astro-static-website`: Optimized for Astro static sites. `_astro/**` assets are immutable.
`sveltekit-static-website`: Optimized for SvelteKit static sites. `_app/**` assets are immutable.
`nuxt-static-website`: Optimized for Nuxt static sites. `_nuxt/**` assets are immutable. | `static-website`, `gatsby-static-website`, `single-page-app`, `astro-static-website`, `sveltekit-static-website`, `nuxt-static-website` |
| `--help (-h)` | no | `string` | Show Help If provided, the command will not execute and will instead print help information. | - |
| `--invalidateCdnCache (-icc)` | no | `boolean` | Invalidate CDN Cache If `true`, invalidates the cache of the CDN connected to the bucket. | - |
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
| `--projectName (-prj)` | no | `string` | Project Name The name of the Stacktape project for this operation. | - |
| `--resourceName (-rn)` | no | `string` | Resource Name The name of the resource as defined in your Stacktape configuration. | - |
| `--sourcePath (-sp)` | no | `string` | Source Path The path to the directory to synchronize with the bucket. This can be an absolute path or relative to the current working directory. | - |
| `--stage (-s)` | no | `string` | Stage The stage for the operation (e.g., `production`, `staging`, `dev-john`). You can set a default stage using the `defaults:configure` command. The maximum length is 12 characters. | - |
| `--templateId (-ti)` | no | `string` | Template ID The ID of the template to download. You can find a list of available templates on the [Config Builder page](https://console.stacktape.com/templates). | - |


## Related commands

- [`deploy`](/cli/deploy) — deploys the full stack including bucket resources and their `directoryUpload` configuration.
- [`delete`](/cli/delete) — deletes the entire stack, including any S3 buckets and their contents.
- [`package-workloads`](/cli/package-workloads) — packages compute resources without deploying; useful when you need to inspect artifacts before a sync or deploy.
