# bucket:sync

The `bucket:sync` command synchronizes the contents of a local directory with an S3 bucket. It mirrors the source directory into the bucket, removing any files from the bucket that no longer exist locally. Use it when you need a local build directory mirrored into an S3 bucket, either by resolving a bucket resource from a deployed Stacktape stack or by passing a bucket ID directly.

## Usage

There are two ways to specify which bucket to sync to.

**Using your Stacktape configuration** — provide `--stage` and `--resourceName`. Stacktape resolves the bucket from your deployed stack and uses the `directoryUpload.directoryPath` defined in your config. Additional `directoryUpload` settings — `excludeFilesPatterns`, `fileOptions`, and `headersPreset` — are also applied automatically from the resource's configuration:

```bash
stacktape bucket:sync --stage production --resourceName myHostingBucket --region eu-west-1
```

**Using a bucket ID directly** — provide `--bucketId` (the AWS bucket name or physical resource ID) and `--sourcePath`:

```bash
stacktape bucket:sync --bucketId my-app-assets-bucket --sourcePath ./dist --region eu-west-1
```


> **Warning:** Files in the destination bucket that are not present in the source directory are deleted. This is a one-way mirror sync, not an additive upload.


## Argument reference

<CliCommandsApiReference command="bucket:sync" sortedArgs={[
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
    "name": "bucketId",
    "required": false,
    "alias": "bi",
    "allowedTypes": [
      "string"
    ],
    "shortDescription": "<p> Bucket ID</p>\n",
    "longDescription": "<p>The identifier of the destination bucket (either the AWS physical resource ID or the bucket name).</p>\n"
  },
  {
    "name": "configPath",
    "required": false,
    "alias": "cp",
    "allowedTypes": [
      "string"
    ],
    "shortDescription": "<p> Config File Path</p>\n",
    "longDescription": "<p>The path to your Stacktape configuration file, relative to the current working directory.</p>\n"
  },
  {
    "name": "currentWorkingDirectory",
    "required": false,
    "alias": "cwd",
    "allowedTypes": [
      "string"
    ],
    "shortDescription": "<p> Current Working Directory</p>\n",
    "longDescription": "<p>The working directory for the operation. All file paths in your configuration will be resolved relative to this directory. By default, this is the directory containing the configuration file.</p>\n"
  },
  {
    "name": "headersPreset",
    "required": false,
    "alias": "hp",
    "allowedTypes": [
      "string"
    ],
    "allowedValues": [
      "static-website",
      "gatsby-static-website",
      "single-page-app",
      "astro-static-website",
      "sveltekit-static-website",
      "nuxt-static-website"
    ],
    "shortDescription": "<p> Headers Preset</p>\n",
    "longDescription": "<p>Configures HTTP headers of uploaded files based on a selected preset.</p>\n<ul>\n<li><code>static-website</code>: Caches all content on the CDN but never in the browser.</li>\n<li><code>gatsby-static-website</code>: Optimized for static websites built with Gatsby.</li>\n<li><code>single-page-app</code>: Optimized for Single-Page Applications. <code>index.html</code> is never cached, while all other assets are cached indefinitely.</li>\n<li><code>astro-static-website</code>: Optimized for Astro static sites. <code>_astro/**</code> assets are immutable.</li>\n<li><code>sveltekit-static-website</code>: Optimized for SvelteKit static sites. <code>_app/**</code> assets are immutable.</li>\n<li><code>nuxt-static-website</code>: Optimized for Nuxt static sites. <code>_nuxt/**</code> assets are immutable.</li>\n</ul>\n"
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
    "name": "invalidateCdnCache",
    "required": false,
    "alias": "icc",
    "allowedTypes": [
      "boolean"
    ],
    "shortDescription": "<p> Invalidate CDN Cache</p>\n",
    "longDescription": "<p>If <code>true</code>, invalidates the cache of the CDN connected to the bucket.</p>\n"
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
  },
  {
    "name": "projectName",
    "required": false,
    "alias": "prj",
    "allowedTypes": [
      "string"
    ],
    "shortDescription": "<p> Project Name</p>\n",
    "longDescription": "<p>The name of the Stacktape project for this operation.</p>\n"
  },
  {
    "name": "resourceName",
    "required": false,
    "alias": "rn",
    "allowedTypes": [
      "string"
    ],
    "shortDescription": "<p> Resource Name</p>\n",
    "longDescription": "<p>The name of the resource as defined in your Stacktape configuration.</p>\n"
  },
  {
    "name": "sourcePath",
    "required": false,
    "alias": "sp",
    "allowedTypes": [
      "string"
    ],
    "shortDescription": "<p> Source Path</p>\n",
    "longDescription": "<p>The path to the directory to synchronize with the bucket. This can be an absolute path or relative to the current working directory.</p>\n"
  },
  {
    "name": "stage",
    "required": false,
    "alias": "s",
    "allowedTypes": [
      "string"
    ],
    "shortDescription": "<p> Stage</p>\n",
    "longDescription": "<p>The stage for the operation (e.g., <code>production</code>, <code>staging</code>, <code>dev-john</code>). You can set a default stage using the <code>defaults:configure</code> command. The maximum length is 12 characters.</p>\n"
  },
  {
    "name": "templateId",
    "required": false,
    "alias": "ti",
    "allowedTypes": [
      "string"
    ],
    "shortDescription": "<p> Template ID</p>\n",
    "longDescription": "<p>The ID of the template to download. You can find a list of available templates on the <a href=\"https://console.stacktape.com/templates\" style=\"font-weight: bold;\" target=\"_blank\" rel=\"noreferrer\" onclick=\"event.stopPropagation();\">Config Builder page</a>.</p>\n"
  }
]} />

## Important flags

The `bucket:sync` command accepts several optional flags that control caching headers, CDN invalidation, and source-path resolution. The flags below cover the most commonly used options beyond `--stage`, `--resourceName`, `--bucketId`, and `--region`.

### `--invalidateCdnCache`

When set to `true`, Stacktape finds any CloudFront distributions connected to the synced bucket and creates an invalidation for all paths (`/*`). Use this after updating a static site or SPA so users see the new content immediately instead of waiting for the CDN cache TTL to expire.

```bash
stacktape bucket:sync --stage production --resourceName website --region eu-west-1 --invalidateCdnCache
```

CDN invalidation starts immediately but may take a few seconds to propagate to all edge locations.

### `--headersPreset`

Configures HTTP headers on uploaded files based on a selected preset. The presets mainly control caching behavior for static websites and common frontend framework output directories. If you are syncing via config mode (`--stage` + `--resourceName`), this can also be set in your Stacktape configuration's `directoryUpload.headersPreset` property — the CLI flag overrides it.

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

Path to the local directory to sync. Can be absolute or relative to the current working directory. `--sourcePath` is only valid with `--bucketId`; providing `--sourcePath` without `--bucketId` causes a validation error. In config mode (`--stage` + `--resourceName`), the source directory is always read from `directoryUpload.directoryPath` in your Stacktape configuration.

### `--resourceName`

The name of the bucket resource as defined in your Stacktape configuration. Used together with `--stage` to identify the target bucket from your deployed stack. The source directory and headers preset are read from the resource's `directoryUpload` config.

## Examples

Sync a React SPA build folder to a hosting bucket and invalidate CDN cache:

```bash
stacktape bucket:sync --stage prod --resourceName frontend --region eu-west-1 --invalidateCdnCache
```

Sync to an arbitrary S3 bucket with a preset for Astro. In `--bucketId` mode, Stacktape uses the explicit `--sourcePath` and `--headersPreset` CLI inputs; config-only `directoryUpload` options such as `excludeFilesPatterns` and `fileOptions` are read only when syncing by `--stage` and `--resourceName`.

```bash
stacktape bucket:sync --bucketId my-astro-site-bucket --sourcePath ./dist --region us-east-1 --headersPreset astro-static-website
```

Sync with a specific AWS profile:

```bash
stacktape bucket:sync --stage staging --resourceName assets --region eu-central-1 --profile my-aws-profile
```

## Related commands

- [`deploy`](/cli/deploy) — deploys the full stack including bucket resources and their `directoryUpload` configuration.
- [`delete`](/cli/delete) — deletes the stack and its managed resources; back up any data you want to keep before running it.
- [`preview-changes`](/cli/preview-changes) — shows what a deployment would change before you run it.
