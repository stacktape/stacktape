# bucket sync

The `bucket sync` command synchronizes the contents of a local directory with an S3 bucket. It mirrors the source directory into the bucket, removing any files from the bucket that no longer exist locally. Use it when you need a local build directory mirrored into an S3 bucket, either by resolving a bucket resource from a deployed Stacktape stack or by passing a bucket ID directly.

## Usage

There are two ways to specify which bucket to sync to.

**Using your Stacktape configuration** — provide `--stage` and the resource name (`bucket sync <resource-name>`). Stacktape resolves the bucket from your deployed stack and uses the `directoryUpload.directoryPath` defined in your config. Additional `directoryUpload` settings — `excludeFilesPatterns`, `fileOptions`, and `headersPreset` — are also applied automatically from the resource's configuration:

```bash
stacktape bucket sync myHostingBucket --stage production --region eu-west-1
```

**Using a bucket ID directly** — provide `--bucket-id` (the AWS bucket name or physical resource ID) and `--source-path`:

```bash
stacktape bucket sync --bucket-id my-app-assets-bucket --source-path ./dist --region eu-west-1
```


> **Warning:** Files in the destination bucket that are not present in the source directory are deleted. This is a one-way mirror sync, not an additive upload.


## Argument reference


## CLI Options: `stacktape bucket sync`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `-r, --region` | yes | `string` | AWS Region — The AWS region for the operation. For a list of available regions, see the [AWS documentation](https://docs.aws.amazon.com/general/latest/gr/rande.html). Inside a project whose config declares `region`, the flag is optional and overrides the config. | `us-east-2`, `us-east-1`, `us-west-1`, `us-west-2`, `ap-east-1`, `ap-south-1`, `ap-northeast-3`, `ap-northeast-2`, `ap-southeast-1`, `ap-southeast-2`, `ap-northeast-1`, `ca-central-1`, `eu-central-1`, `eu-west-1`, `eu-west-2`, `eu-west-3`, `eu-north-1`, `me-south-1`, `sa-east-1`, `af-south-1`, `eu-south-1` |
| `--aws-account` | no | `string` | AWS Account — The name of the AWS account to use for the operation. The account must first be connected in the [Stacktape Console](https://console.stacktape.com/aws-accounts). Without it, the account is chosen by `--profile`, `AWS_PROFILE` or AWS credentials in environment variables, then by your saved default, then by your organization's only connected account. `--aws-account` takes precedence over all of them, but AWS credentials in environment variables must then belong to that account. | - |
| `--bucket-id` | no | `string` | Bucket ID — The identifier of the destination bucket (either the AWS physical resource ID or the bucket name). | - |
| `-c, --config` | no | `string` | Config File Path — The path to your Stacktape configuration file, relative to the current working directory. | - |
| `--cwd` | no | `string` | Current Working Directory — The working directory for the operation. All file paths in your configuration will be resolved relative to this directory. By default, this is the directory containing the configuration file. | - |
| `--headers-preset` | no | `string` | Headers Preset — Configures HTTP headers of uploaded files based on a selected preset. • `static-website`: Caches all content on the CDN but never in the browser. • `gatsby-static-website`: Optimized for static websites built with Gatsby. • `single-page-app`: Optimized for Single-Page Applications. `index.html` is never cached, while all other assets are cached indefinitely. • `astro-static-website`: Optimized for Astro static sites. `_astro/**` assets are immutable. • `sveltekit-static-website`: Optimized for SvelteKit static sites. `_app/**` assets are immutable. • `nuxt-static-website`: Optimized for Nuxt static sites. `_nuxt/**` assets are immutable. | `static-website`, `gatsby-static-website`, `single-page-app`, `astro-static-website`, `sveltekit-static-website`, `nuxt-static-website` |
| `-h, --help` | no | `string` | Show Help — If provided, the command will not execute and will instead print help information. | - |
| `--invalidate-cdn-cache` | no | `boolean` | Invalidate CDN Cache — If `true`, invalidates the cache of the CDN connected to the bucket. | - |
| `--log-level` | no | `string` | Log Level — The level of logs to print to the console. • `info`: Basic information about the operation. • `error`: Only errors. • `debug`: Detailed information for debugging. | `info`, `debug`, `error` |
| `-p, --profile` | no | `string` | AWS Profile — The AWS profile to use for the command. You can manage profiles using the `aws-profile:*` commands and set a default profile with `defaults set`. For commands that use a connected AWS account, `--profile` (or `AWS_PROFILE`) selects the connected account the profile belongs to, unless `--aws-account` is set. The command fails if that account is not connected. | - |
| `--project` | no | `string` | Project Name — The name of the Stacktape project for this operation. Commands that target a stack take it from `projectName` in the project's config when the flag is absent. | - |
| `--quiet` | no | `boolean` | Quiet — Hide progress, banners, success messages and hints. Command output, warnings and errors are still printed. | - |
| `--resource-name (positional 1)` | no | `string` | Resource Name — The name of the resource as defined in your Stacktape configuration. | - |
| `--source-path` | no | `string` | Source Path — The path to the directory to synchronize with the bucket. This can be an absolute path or relative to the current working directory. | - |
| `-s, --stage` | no | `string` | Stage — The stage for the operation (e.g., `production`, `staging`, `dev-john`). You can set a default stage using the `defaults set` command. Stage names use lowercase letters, numbers and dashes, with at least 2 characters and no fixed maximum. Stacktape shortens an AWS resource name that would be too long and adds a hash. | - |


## Important flags

The `bucket sync` command accepts several optional flags that control caching headers, CDN invalidation, and source-path resolution. The flags below cover the most commonly used options beyond the resource name, `--stage`, `--bucket-id`, and `--region`.

### `--invalidate-cdn-cache`

When set to `true`, Stacktape finds any CloudFront distributions connected to the synced bucket and creates an invalidation for all paths (`/*`). Use this after updating a static site or SPA so users see the new content immediately instead of waiting for the CDN cache TTL to expire.

```bash
stacktape bucket sync website --stage production --region eu-west-1 --invalidate-cdn-cache
```

CDN invalidation starts immediately but may take a few seconds to propagate to all edge locations.

### `--headers-preset`

Configures HTTP headers on uploaded files based on a selected preset. The presets mainly control caching behavior for static websites and common frontend framework output directories. If you are syncing via config mode (`--stage` + `--resource-name`), this can also be set in your Stacktape configuration's `directoryUpload.headersPreset` property — the CLI flag overrides it.

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
stacktape bucket sync --bucket-id my-spa-bucket --source-path ./build --region us-east-1 --headers-preset single-page-app
```

### `--source-path`

Path to the local directory to sync. Can be absolute or relative to the current working directory. `--source-path` is only valid with `--bucket-id`; providing `--source-path` without `--bucket-id` causes a validation error. In config mode (`--stage` + `--resource-name`), the source directory is always read from `directoryUpload.directoryPath` in your Stacktape configuration.

### `<resource-name>`

The name of the bucket resource as defined in your Stacktape configuration. Used together with `--stage` to identify the target bucket from your deployed stack. The source directory and headers preset are read from the resource's `directoryUpload` config.

## Examples

Sync a React SPA build folder to a hosting bucket and invalidate CDN cache:

```bash
stacktape bucket sync frontend --stage prod --region eu-west-1 --invalidate-cdn-cache
```

Sync to an arbitrary S3 bucket with a preset for Astro. In `--bucket-id` mode, Stacktape uses the explicit `--source-path` and `--headers-preset` CLI inputs; config-only `directoryUpload` options such as `excludeFilesPatterns` and `fileOptions` are read only when syncing by `--stage` and `--resource-name`.

```bash
stacktape bucket sync --bucket-id my-astro-site-bucket --source-path ./dist --region us-east-1 --headers-preset astro-static-website
```

Sync with a specific AWS profile:

```bash
stacktape bucket sync assets --stage staging --region eu-central-1 --profile my-aws-profile
```

## Related commands

- [`deploy`](/cli/deploy) — deploys the full stack including bucket resources and their `directoryUpload` configuration.
- [`delete`](/cli/delete) — deletes the stack and its managed resources; back up any data you want to keep before running it.
- [`diff`](/cli/diff) — shows what a deployment would change before you run it.
