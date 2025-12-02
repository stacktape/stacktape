# bucket:sync

# Overview and basic usage

### bucket:sync

Synchronizes the contents of a local directory with an S3 bucket.

You can specify the bucket in two ways:

- **Using Stacktape configuration:** Provide the `stage` and `resourceName`. Stacktape will identify the bucket from the
  deployed stack and sync the directory specified in the configuration file.
- **Using bucket ID:** Provide a valid `bucketId` (AWS physical resource ID or bucket name) and a `sourcePath`.

Files in the bucket that are not present in the source directory will be removed.

{/* WRITE ONLY BELOW THIS LINE */}

{/* WRITE ONLY ABOVE THIS LINE */}

```bash
stacktape bucket:sync --region <<region>>
```

# API reference

<CliCommandsApiReference
  command="bucket:sync"
  sortedArgs={[
    {
      description:
        "#### AWS Region\n\n---\n\nThe AWS region for the operation. For a list of available regions, see the [AWS documentation](https://docs.aws.amazon.com/general/latest/gr/rande.html).",
      allowedTypes: ["string"],
      allowedValues: [
        "af-south-1",
        "ap-east-1",
        "ap-northeast-1",
        "ap-northeast-2",
        "ap-northeast-3",
        "ap-south-1",
        "ap-southeast-1",
        "ap-southeast-2",
        "ca-central-1",
        "eu-central-1",
        "eu-north-1",
        "eu-south-1",
        "eu-west-1",
        "eu-west-2",
        "eu-west-3",
        "me-south-1",
        "sa-east-1",
        "us-east-1",
        "us-east-2",
        "us-west-1",
        "us-west-2"
      ],
      alias: "r",
      required: true,
      name: "region",
      shortDescription: "<p> AWS Region</p>\n",
      longDescription:
        '<p>The AWS region for the operation. For a list of available regions, see the <a href="https://docs.aws.amazon.com/general/latest/gr/rande.html" style="font-weight: bold;" target="_blank" rel="noreferrer" onclick="event.stopPropagation();">AWS documentation</a>.</p>\n'
    },
    {
      description:
        "#### Stage\n\n---\n\nThe stage for the operation (e.g., `production`, `staging`, `dev-john`). You can set a default stage using the `defaults:configure` command. The maximum length is 12 characters.",
      allowedTypes: ["string"],
      alias: "s",
      required: true,
      name: "stage",
      shortDescription: "<p> Stage</p>\n",
      longDescription:
        "<p>The stage for the operation (e.g., <code>production</code>, <code>staging</code>, <code>dev-john</code>). You can set a default stage using the <code>defaults:configure</code> command. The maximum length is 12 characters.</p>\n"
    },
    {
      description:
        "#### AWS Account\n\n---\n\nThe name of the AWS account to use for the operation. The account must first be connected in the [Stacktape console](https://console.stacktape.com/aws-accounts).",
      allowedTypes: ["string"],
      alias: "aa",
      required: false,
      name: "awsAccount",
      shortDescription: "<p> AWS Account</p>\n",
      longDescription:
        '<p>The name of the AWS account to use for the operation. The account must first be connected in the <a href="https://console.stacktape.com/aws-accounts" style="font-weight: bold;" target="_blank" rel="noreferrer" onclick="event.stopPropagation();">Stacktape console</a>.</p>\n'
    },
    {
      description:
        "#### Bucket ID\n\n---\n\nThe identifier of the destination bucket (either the AWS physical resource ID or the bucket name).",
      allowedTypes: ["string"],
      alias: "bi",
      required: false,
      name: "bucketId",
      shortDescription: "<p> Bucket ID</p>\n",
      longDescription:
        "<p>The identifier of the destination bucket (either the AWS physical resource ID or the bucket name).</p>\n"
    },
    {
      description:
        "#### Config File Path\n\n---\n\nThe path to your Stacktape configuration file, relative to the current working directory.",
      allowedTypes: ["string"],
      alias: "cp",
      required: false,
      name: "configPath",
      shortDescription: "<p> Config File Path</p>\n",
      longDescription:
        "<p>The path to your Stacktape configuration file, relative to the current working directory.</p>\n"
    },
    {
      description:
        "#### Current Working Directory\n\n---\n\nThe working directory for the operation. All file paths in your configuration will be resolved relative to this directory. By default, this is the directory containing the configuration file.",
      allowedTypes: ["string"],
      alias: "cwd",
      required: false,
      name: "currentWorkingDirectory",
      shortDescription: "<p> Current Working Directory</p>\n",
      longDescription:
        "<p>The working directory for the operation. All file paths in your configuration will be resolved relative to this directory. By default, this is the directory containing the configuration file.</p>\n"
    },
    {
      description:
        "#### Headers Preset\n\n---\n\nConfigures HTTP headers of uploaded files based on a selected preset.\n\n- `static-website`: Caches all content on the CDN but never in the browser. Sets `cache-control` to `public, max-age=0, s-maxage=31536000, must-revalidate`.\n- `gatsby-static-website`: Optimized for static websites built with [Gatsby](https://www.gatsbyjs.com/), following [Gatsby caching recommendations](https://www.gatsbyjs.com/docs/caching/).\n- `single-page-app`: Optimized for Single-Page Applications. `index.html` is never cached, while all other assets (JS, CSS, etc.) are cached indefinitely. You should always add a content hash to asset filenames to ensure users get the latest version after a deployment.",
      allowedTypes: ["string"],
      allowedValues: ["gatsby-static-website", "single-page-app", "static-website"],
      alias: "hp",
      required: false,
      name: "headersPreset",
      shortDescription: "<p> Headers Preset</p>\n",
      longDescription:
        '<p>Configures HTTP headers of uploaded files based on a selected preset.</p>\n<ul>\n<li><code>static-website</code>: Caches all content on the CDN but never in the browser. Sets <code>cache-control</code> to <code>public, max-age=0, s-maxage=31536000, must-revalidate</code>.</li>\n<li><code>gatsby-static-website</code>: Optimized for static websites built with <a href="https://www.gatsbyjs.com/" style="font-weight: bold;" target="_blank" rel="noreferrer" onclick="event.stopPropagation();">Gatsby</a>, following <a href="https://www.gatsbyjs.com/docs/caching/" style="font-weight: bold;" target="_blank" rel="noreferrer" onclick="event.stopPropagation();">Gatsby caching recommendations</a>.</li>\n<li><code>single-page-app</code>: Optimized for Single-Page Applications. <code>index.html</code> is never cached, while all other assets (JS, CSS, etc.) are cached indefinitely. You should always add a content hash to asset filenames to ensure users get the latest version after a deployment.</li>\n</ul>\n'
    },
    {
      description:
        "#### Show Help\n\n---\n\nIf provided, the command will not execute and will instead print help information.",
      allowedTypes: ["string"],
      alias: "h",
      required: false,
      name: "help",
      shortDescription: "<p> Show Help</p>\n",
      longDescription: "<p>If provided, the command will not execute and will instead print help information.</p>\n"
    },
    {
      description:
        "#### Invalidate CDN Cache\n\n---\n\nIf `true`, invalidates the cache of the CDN connected to the bucket.",
      allowedTypes: ["boolean"],
      alias: "icc",
      required: false,
      name: "invalidateCdnCache",
      shortDescription: "<p> Invalidate CDN Cache</p>\n",
      longDescription: "<p>If <code>true</code>, invalidates the cache of the CDN connected to the bucket.</p>\n"
    },
    {
      description:
        "#### Log Format\n\n---\n\nThe format of logs printed to the console.\n\n- `fancy`: Colorized and dynamically re-rendered logs.\n- `normal`: Colorized but not dynamically re-rendered logs.\n- `basic`: Simple text only.\n- `json`: Logs printed as JSON objects.",
      allowedTypes: ["string"],
      allowedValues: ["basic", "fancy", "json", "normal"],
      alias: "lf",
      required: false,
      name: "logFormat",
      shortDescription: "<p> Log Format</p>\n",
      longDescription:
        "<p>The format of logs printed to the console.</p>\n<ul>\n<li><code>fancy</code>: Colorized and dynamically re-rendered logs.</li>\n<li><code>normal</code>: Colorized but not dynamically re-rendered logs.</li>\n<li><code>basic</code>: Simple text only.</li>\n<li><code>json</code>: Logs printed as JSON objects.</li>\n</ul>\n"
    },
    {
      description:
        "#### Log Level\n\n---\n\nThe level of logs to print to the console.\n\n- `info`: Basic information about the operation.\n- `error`: Only errors.\n- `debug`: Detailed information for debugging.",
      allowedTypes: ["string"],
      allowedValues: ["debug", "error", "info"],
      alias: "ll",
      required: false,
      name: "logLevel",
      shortDescription: "<p> Log Level</p>\n",
      longDescription:
        "<p>The level of logs to print to the console.</p>\n<ul>\n<li><code>info</code>: Basic information about the operation.</li>\n<li><code>error</code>: Only errors.</li>\n<li><code>debug</code>: Detailed information for debugging.</li>\n</ul>\n"
    },
    {
      description:
        "#### AWS Profile\n\n---\n\nThe AWS profile to use for the command. You can manage profiles using the `aws-profile:*` commands and set a default profile with `defaults:configure`.",
      allowedTypes: ["string"],
      alias: "p",
      required: false,
      name: "profile",
      shortDescription: "<p> AWS Profile</p>\n",
      longDescription:
        "<p>The AWS profile to use for the command. You can manage profiles using the <code>aws-profile:*</code> commands and set a default profile with <code>defaults:configure</code>.</p>\n"
    },
    {
      description: "#### Project Name\n\n---\n\nThe name of the Stacktape project for this operation.",
      allowedTypes: ["string"],
      alias: "prj",
      required: false,
      name: "projectName",
      shortDescription: "<p> Project Name</p>\n",
      longDescription: "<p>The name of the Stacktape project for this operation.</p>\n"
    },
    { allowedTypes: ["string"], alias: "rn", required: false, name: "resourceName", shortDescription: "" },
    {
      description:
        "#### Source Path\n\n---\n\nThe path to the directory to synchronize with the bucket. This can be an absolute path or relative to the current working directory.",
      allowedTypes: ["string"],
      alias: "sp",
      required: false,
      name: "sourcePath",
      shortDescription: "<p> Source Path</p>\n",
      longDescription:
        "<p>The path to the directory to synchronize with the bucket. This can be an absolute path or relative to the current working directory.</p>\n"
    },
    {
      description:
        "#### Template ID\n\n---\n\nThe ID of the template to download. You can find a list of available templates on the [Config Builder page](https://console.stacktape.com/templates).",
      allowedTypes: ["string"],
      alias: "ti",
      required: false,
      name: "templateId",
      shortDescription: "<p> Template ID</p>\n",
      longDescription:
        '<p>The ID of the template to download. You can find a list of available templates on the <a href="https://console.stacktape.com/templates" style="font-weight: bold;" target="_blank" rel="noreferrer" onclick="event.stopPropagation();">Config Builder page</a>.</p>\n'
    }
  ]}
/>