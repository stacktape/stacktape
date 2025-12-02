# secret:create

# Overview and basic usage

### secret:create

Creates a secret that is securely stored in AWS Secrets Manager.

This secret can then be referenced in your configuration using the `$Secret('secret-name')` directive. This is useful
for storing sensitive data like passwords, API keys, or other credentials.

{/* WRITE ONLY BELOW THIS LINE */}

{/* WRITE ONLY ABOVE THIS LINE */}

```bash
stacktape secret:create --region <<region>>
```

# API reference

<CliCommandsApiReference
  command="secret:create"
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
    }
  ]}
/>